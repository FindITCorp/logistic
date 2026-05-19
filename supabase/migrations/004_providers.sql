-- Logistics providers (forwarders like TJ-China Freight)
create table if not exists providers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                    -- "TJ-China Freight"
  contact_name    text,                             -- "Zoe"
  contact_email   text,
  contact_whatsapp text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
-- Add unique constraint idempotently
do $$ begin
  alter table providers add constraint providers_name_unique unique (name);
exception when duplicate_table then null;
         when duplicate_object then null; end $$;

-- Rate tiers per provider (what the provider charges us)
create table if not exists provider_rates (
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
do $$ begin
  create policy "providers_read"  on providers for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "providers_write" on providers for all using (true);
exception when duplicate_object then null; end $$;

alter table provider_rates enable row level security;
do $$ begin
  create policy "provider_rates_read"  on provider_rates for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "provider_rates_write" on provider_rates for all using (true);
exception when duplicate_object then null; end $$;

-- Seed: TJ-China Freight (Zoe) with real rate $30/CBM flat
insert into providers (name, contact_name, contact_whatsapp, notes)
values ('TJ-China Freight', 'Zoe', null, 'Weekly consolidations to Manzanillo + Balboa. TT ~35 days. Cutoff Monday, ETD next Monday.')
on conflict (name) do nothing;

-- Only insert rates if provider has no rates yet (idempotent)
insert into provider_rates (provider_id, origin_city, min_volume_m3, max_volume_m3, rate_per_m3, notes)
select p.id, 'guangzhou'::origin_city, 0,    5,    30, 'Base rate — volume discount TBD'    from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id)
union all
select p.id, 'guangzhou'::origin_city, 5,    15,   28, 'Estimated discount 6-15 CBM'         from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id)
union all
select p.id, 'guangzhou'::origin_city, 15,   null, 25, 'Estimated discount 15+ CBM'          from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id)
union all
select p.id, 'shenzhen'::origin_city,  0,    5,    30, 'Same rate as Guangzhou'              from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id)
union all
select p.id, 'shenzhen'::origin_city,  5,    15,   28, 'Estimated discount 6-15 CBM'         from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id)
union all
select p.id, 'shenzhen'::origin_city,  15,   null, 25, 'Estimated discount 15+ CBM'          from providers p where p.name = 'TJ-China Freight' and not exists (select 1 from provider_rates pr where pr.provider_id = p.id);
