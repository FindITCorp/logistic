-- Leads / interest capture from landing page (idempotent)
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  whatsapp        text,
  email           text,
  origin_city     origin_city,
  monthly_volume_m3 numeric(8,2),
  product_type    text,
  notes           text,
  status          text not null default 'new',
  created_at      timestamptz not null default now()
);

alter table leads enable row level security;
do $$ begin create policy "leads_read"  on leads for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "leads_write" on leads for all   using (true); exception when duplicate_object then null; end $$;
