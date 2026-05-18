-- Logistics providers (forwarders like TJ-China Freight)
create table providers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                    -- "TJ-China Freight"
  contact_name    text,                             -- "Zoe"
  contact_email   text,
  contact_whatsapp text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Rate tiers per provider (what the provider charges us)
create table provider_rates (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references providers(id) on delete cascade,
  origin_city     origin_city not null,
  min_volume_m3   numeric(8,3) not null default 0,
  max_volume_m3   numeric(8,3),                     -- null = no limit
  rate_per_m3     numeric(8,2) not null,             -- what provider charges us
  notes           text,                             -- "includes warehouse handling"
  effective_from  date not null default current_date,
  created_at      timestamptz not null default now()
);

-- Link pool to the provider assigned for that shipment
alter table pools add column if not exists provider_id uuid references providers(id);
alter table pools add column if not exists reference_price_m3 numeric(8,2) not null default 100;

-- RLS
alter table providers enable row level security;
create policy "providers_read"   on providers for select using (true);
create policy "providers_write"  on providers for all using (true);

alter table provider_rates enable row level security;
create policy "provider_rates_read"  on provider_rates for select using (true);
create policy "provider_rates_write" on provider_rates for all using (true);

-- Seed: TJ-China Freight (Zoe) with real rate $30/CBM flat
insert into providers (name, contact_name, contact_whatsapp, notes)
values ('TJ-China Freight', 'Zoe', null, 'Weekly consolidations to Manzanillo + Balboa. TT ~35 days. Cutoff Monday, ETD next Monday.');

insert into provider_rates (provider_id, origin_city, min_volume_m3, max_volume_m3, rate_per_m3, notes)
select id, 'guangzhou', 0,    5,    30, 'Base rate — volume discount TBD'    from providers where name = 'TJ-China Freight'
union all
select id, 'guangzhou', 5,    15,   28, 'Estimated discount 6-15 CBM'         from providers where name = 'TJ-China Freight'
union all
select id, 'guangzhou', 15,   null, 25, 'Estimated discount 15+ CBM'          from providers where name = 'TJ-China Freight'
union all
select id, 'shenzhen',  0,    5,    30, 'Same rate as Guangzhou'              from providers where name = 'TJ-China Freight'
union all
select id, 'shenzhen',  5,    15,   28, 'Estimated discount 6-15 CBM'         from providers where name = 'TJ-China Freight'
union all
select id, 'shenzhen',  15,   null, 25, 'Estimated discount 15+ CBM'          from providers where name = 'TJ-China Freight';
