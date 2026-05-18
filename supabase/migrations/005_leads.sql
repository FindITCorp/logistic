-- Leads / interest capture from landing page
create table leads (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  whatsapp        text,
  email           text,
  origin_city     origin_city,
  monthly_volume_m3 numeric(8,2),      -- self-reported monthly volume
  product_type    text,                -- what they import
  notes           text,
  status          text not null default 'new',  -- new | contacted | converted | lost
  created_at      timestamptz not null default now()
);

alter table leads enable row level security;
create policy "leads_read"  on leads for select using (true);
create policy "leads_write" on leads for all   using (true);
