-- 016_settings_reconciliation.sql
-- Fase 2 de autonomía: control en runtime + reconciliación + opt-out.
-- Todo idempotente.

-- ─── app_settings: feature flags controlables sin redeploy ────────────────────
-- Reemplaza el control por env var (NURTURE_ENABLED) con un toggle en DB que
-- el admin puede cambiar desde la UI. El env var sigue sirviendo de fallback.
create table if not exists app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Defaults: todo el outreach arranca APAGADO (decisión explícita del dueño).
insert into app_settings (key, value) values
  ('nurture_enabled',       'false'),
  ('notifications_enabled', 'false')
on conflict (key) do nothing;

-- ─── leads.opted_out: respeto a la baja (unsubscribe) ─────────────────────────
alter table leads add column if not exists opted_out boolean not null default false;
alter table leads add column if not exists optout_token text;

-- Token estable por lead para el link de baja (no expira).
update leads
  set optout_token = encode(gen_random_bytes(16), 'hex')
  where optout_token is null;

create unique index if not exists idx_leads_optout_token on leads (optout_token);

-- ─── payments.idempotency_key: ya existe el índice (012); aquí solo se usa ─────
-- (no-op estructural — la generación se hace en la API)

-- ─── Vista de deuda por cobrar (reconciliación) ───────────────────────────────
-- Un envío con precio bloqueado pero sin pago final = deuda pendiente.
-- advance_due: el anticipo (carrier_rate × volumen) aún sin pagar.
-- final_due:   el saldo (precio final − anticipo) × volumen aún sin pagar.
create or replace view outstanding_debt as
select
  s.id                                   as shipment_id,
  s.client_code,
  s.volume_m3,
  s.price_per_m3,
  s.advance_paid,
  s.advance_amount,
  s.final_paid,
  s.final_amount,
  p.pool_number,
  p.status                               as pool_status,
  -- anticipo estimado = carrier_rate del pool × volumen
  round(coalesce(p.carrier_rate, 0) * s.volume_m3, 2)                       as advance_estimate_usd,
  -- total estimado = precio final × volumen
  round(coalesce(s.price_per_m3, 0) * s.volume_m3, 2)                       as total_estimate_usd,
  -- saldo final estimado = (precio − carrier) × volumen
  round(greatest(coalesce(s.price_per_m3, 0) - coalesce(p.carrier_rate, 0), 0) * s.volume_m3, 2) as final_estimate_usd,
  case
    when not s.advance_paid then 'advance_pending'
    when s.advance_paid and not s.final_paid then 'final_pending'
    else 'settled'
  end                                    as debt_stage
from shipments s
join pools p on p.id = s.pool_id
where s.price_per_m3 is not null
  and (not s.advance_paid or not s.final_paid)
  and s.status <> 'delivered';
