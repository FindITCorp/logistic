-- ─── 012_integrity_autonomy.sql ─────────────────────────────────────────────
-- Atomicidad (elimina race conditions), pricing autoritativo en SQL,
-- conciliación de margen, rate limiting durable, idempotencia, y el
-- modelo de datos para el motor de autonomía (referidos + nurture).
-- Todo idempotente.

-- ─── pools.opened_at: derivar el día del pool de forma robusta ───────────────
alter table pools add column if not exists opened_at timestamptz;
update pools set opened_at = created_at where opened_at is null;

-- ─── Pricing portado a SQL (fuente autoritativa al unirse al pool) ───────────
-- Debe mantenerse en sincronía con lib/pricing.ts. Tests de paridad en
-- tests/pricing-parity.spec.ts validan que no diverjan.

-- Tarifa del naviero por m³ según volumen (LCL tiers / FCL amortizado).
create or replace function findit_carrier_rate(p_volume numeric)
returns numeric language sql immutable as $$
  select case
    when p_volume >= 41.25 then 3200.0 / greatest(p_volume, 1)  -- FCL 40ft
    when p_volume >= 20    then 2000.0 / greatest(p_volume, 1)  -- FCL 20ft
    when p_volume >= 15    then 101                              -- LCL tier 15-20
    when p_volume >= 5     then 106                              -- LCL tier 5-15
    else 121                                                     -- LCL tier 0-5
  end;
$$;

-- Precio que paga el cliente por m³ según día de entrada y volumen del pool.
create or replace function findit_client_price(p_day int, p_volume numeric)
returns numeric language plpgsql immutable as $$
declare
  v_carrier       numeric := findit_carrier_rate(p_volume);
  v_overhead      numeric := 620.0 / greatest(greatest(p_volume, 1), 5);
  v_total         numeric := v_carrier + v_overhead;
  v_floor         numeric := v_carrier * 0.30;
  v_min           numeric := v_total + v_floor;
  v_max           numeric := greatest(252, v_min);
  v_distributable numeric := greatest(0, v_max - v_min);
  v_day           int     := least(greatest(p_day, 1), 10);
  v_pct           numeric;
begin
  v_pct := case v_day
    when 1 then 90 when 2 then 80 when 3 then 70 when 4 then 60 when 5 then 50
    when 6 then 40 when 7 then 30 when 8 then 20 when 9 then 10 else 10 end;
  return round(v_max - v_distributable * v_pct / 100.0, 2);
end;
$$;

-- ─── join_pool: asignación ATÓMICA (elimina la race condition) ───────────────
-- Bloquea la fila del pool (FOR UPDATE), recalcula volumen y precio de forma
-- serializada, inserta el miembro, actualiza envío y pool — todo en una sola
-- transacción. Idempotente: rechaza doble-asignación del mismo envío.
create or replace function join_pool(p_pool_id uuid, p_shipment_id uuid)
returns jsonb language plpgsql
set search_path = public as $$
declare
  v_pool         pools%rowtype;
  v_ship         shipments%rowtype;
  v_volume_after numeric;
  v_price        numeric;
  v_exists       int;
begin
  -- Lock de la fila del pool: serializa entradas concurrentes.
  select * into v_pool from pools where id = p_pool_id for update;
  if not found then raise exception 'POOL_NOT_FOUND'; end if;
  if v_pool.status <> 'active' then raise exception 'POOL_CLOSED'; end if;

  select * into v_ship from shipments where id = p_shipment_id;
  if not found then raise exception 'SHIPMENT_NOT_FOUND'; end if;
  if v_ship.status <> 'received' then raise exception 'SHIPMENT_ALREADY_ASSIGNED'; end if;

  -- Idempotencia: ya es miembro de algún pool.
  select count(*) into v_exists from pool_members where shipment_id = p_shipment_id;
  if v_exists > 0 then raise exception 'ALREADY_ASSIGNED'; end if;

  v_volume_after := v_pool.current_volume_m3 + v_ship.volume_m3;
  v_price := findit_client_price(v_pool.day_number, v_volume_after);

  insert into pool_members (pool_id, shipment_id, client_id, volume_m3, price_per_m3, day_joined)
  values (p_pool_id, p_shipment_id, v_ship.client_id, v_ship.volume_m3, v_price, v_pool.day_number);

  update shipments set
    pool_id = p_pool_id, status = 'assigned',
    price_per_m3 = v_price, assigned_at = now()
  where id = p_shipment_id;

  update pools set
    current_volume_m3 = v_volume_after,
    participants = participants + 1,
    carrier_rate = findit_carrier_rate(v_volume_after)
  where id = p_pool_id;

  return jsonb_build_object(
    'price_per_m3', v_price,
    'volume_after', v_volume_after,
    'pool_number', v_pool.pool_number,
    'pool_id', p_pool_id
  );
end;
$$;

-- ─── recompute_pool_volume: auto-sanación de drift de volumen ────────────────
-- Recalcula current_volume_m3 y participants desde la suma real de miembros.
-- El cron de autopilot lo ejecuta para corregir cualquier inconsistencia.
create or replace function recompute_pool_volume(p_pool_id uuid)
returns void language plpgsql
set search_path = public as $$
declare v_vol numeric; v_n int;
begin
  select coalesce(sum(volume_m3), 0), count(*) into v_vol, v_n
  from pool_members where pool_id = p_pool_id;
  update pools set
    current_volume_m3 = v_vol,
    participants = v_n,
    carrier_rate = findit_carrier_rate(v_vol)
  where id = p_pool_id;
end;
$$;

-- ─── Vista de conciliación: P&L real por pool ────────────────────────────────
create or replace view pool_settlement as
select
  p.id                                              as pool_id,
  p.pool_number,
  p.origin_city,
  p.status,
  p.day_number,
  p.current_volume_m3,
  coalesce(sum(pm.volume_m3), 0)                    as members_volume_m3,
  coalesce(count(pm.id), 0)                         as members_count,
  coalesce(sum(pm.price_per_m3 * pm.volume_m3), 0)  as revenue_usd,
  round(findit_carrier_rate(p.current_volume_m3), 2) as carrier_rate_per_m3,
  round((findit_carrier_rate(p.current_volume_m3) * p.current_volume_m3) + 620, 2) as cost_usd,
  round(
    coalesce(sum(pm.price_per_m3 * pm.volume_m3), 0)
    - ((findit_carrier_rate(p.current_volume_m3) * p.current_volume_m3) + 620), 2
  )                                                 as margin_usd
from pools p
left join pool_members pm on pm.pool_id = p.id
group by p.id;

-- ─── Rate limiting durable (cross-instance, sirve en serverless) ─────────────
create table if not exists rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);
alter table rate_limits enable row level security;

create or replace function rate_limit_hit(p_key text, p_max int, p_window_s int)
returns boolean language plpgsql
set search_path = public as $$
declare v_count int;
begin
  insert into rate_limits(key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_s) then 1
      else rate_limits.count + 1 end,
    window_start = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_s) then now()
      else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- ─── Idempotencia en pagos ───────────────────────────────────────────────────
alter table payments add column if not exists idempotency_key text;
create unique index if not exists payments_idempotency_idx
  on payments(idempotency_key) where idempotency_key is not null;

-- ─── Referidos: crecimiento viral (cliente trae cliente) ─────────────────────
alter table clients
  add column if not exists referral_code    text,
  add column if not exists referred_by_code text;
update clients set referral_code = client_code where referral_code is null;
create unique index if not exists clients_referral_code_idx
  on clients(referral_code) where referral_code is not null;

-- ─── Motor de nurture: follow-ups automáticos de leads ───────────────────────
create table if not exists lead_followups (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads(id) on delete cascade,
  channel    text not null default 'whatsapp',
  step       int  not null default 1,
  due_at     timestamptz not null,
  status     text not null default 'pending', -- pending|sent|failed|skipped
  sent_at    timestamptz,
  created_at timestamptz default now()
);
alter table lead_followups enable row level security;
create index if not exists lead_followups_due_idx on lead_followups(status, due_at);

-- leads: campo source/pool ya añadidos en 010; agregar last_contacted para nurture
alter table leads add column if not exists last_contacted_at timestamptz;
