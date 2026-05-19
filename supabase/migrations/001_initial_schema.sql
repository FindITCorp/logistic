-- FINDIT Logistic — Initial Schema (idempotent)

do $$ begin create type assignment_mode as enum ('auto', 'manual'); exception when duplicate_object then null; end $$;
do $$ begin create type notify_by as enum ('whatsapp', 'email', 'both'); exception when duplicate_object then null; end $$;
do $$ begin create type pool_status as enum ('active', 'closed', 'shipped'); exception when duplicate_object then null; end $$;
do $$ begin create type shipment_status as enum ('received', 'assigned', 'shipped'); exception when duplicate_object then null; end $$;
do $$ begin create type origin_city as enum ('shanghai', 'guangzhou', 'shenzhen'); exception when duplicate_object then null; end $$;

-- Clients
create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  client_code      text unique not null,
  name             text not null,
  whatsapp         text,
  email            text,
  assignment_mode  assignment_mode not null default 'auto',
  notify_by        notify_by not null default 'whatsapp',
  created_at       timestamptz not null default now()
);

-- Active pools
create table if not exists pools (
  id                  uuid primary key default gen_random_uuid(),
  origin_city         origin_city not null,
  destination         text not null default 'Colón, Panamá',
  current_volume_m3   numeric(8,3) not null default 0,
  participants        int not null default 0,
  day_number          int not null default 1 check (day_number between 1 and 10),
  status              pool_status not null default 'active',
  carrier_rate        numeric(8,2) not null default 100,
  created_at          timestamptz not null default now()
);

-- Shipments
create table if not exists shipments (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id),
  client_code  text not null,
  weight_kg    numeric(8,3) not null,
  volume_m3    numeric(8,3) not null,
  origin_city  origin_city not null,
  status       shipment_status not null default 'received',
  pool_id      uuid references pools(id),
  price_per_m3 numeric(8,2),
  arrived_at   timestamptz not null default now(),
  assigned_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Pool membership ledger
create table if not exists pool_members (
  id           uuid primary key default gen_random_uuid(),
  pool_id      uuid not null references pools(id),
  shipment_id  uuid not null references shipments(id),
  client_id    uuid not null references clients(id),
  volume_m3    numeric(8,3) not null,
  price_per_m3 numeric(8,2) not null,
  joined_at    timestamptz not null default now()
);

-- Seed demo pools (only if empty)
insert into pools (origin_city, current_volume_m3, participants, day_number, carrier_rate)
select * from (values
  ('shanghai'::origin_city,   8.5,  6,  3,  90::numeric),
  ('guangzhou'::origin_city,  2.1,  2,  1,  100::numeric),
  ('shenzhen'::origin_city,  16.4, 11,  7,  85::numeric)
) as v(origin_city, current_volume_m3, participants, day_number, carrier_rate)
where not exists (select 1 from pools);

-- RLS
alter table pools enable row level security;
do $$ begin create policy "pools_public_read" on pools for select using (true); exception when duplicate_object then null; end $$;

alter table clients enable row level security;
do $$ begin create policy "clients_insert" on clients for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "clients_read_own" on clients for select using (true); exception when duplicate_object then null; end $$;

alter table shipments enable row level security;
do $$ begin create policy "shipments_read" on shipments for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "shipments_insert" on shipments for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "shipments_update" on shipments for update using (true); exception when duplicate_object then null; end $$;

alter table pool_members enable row level security;
do $$ begin create policy "pool_members_read" on pool_members for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "pool_members_insert" on pool_members for insert with check (true); exception when duplicate_object then null; end $$;
