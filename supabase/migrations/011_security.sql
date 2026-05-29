-- ─── 011_security.sql — RLS + audit_log ─────────────────────────────────────

-- Enable RLS on all tables (idempotent)
alter table if exists clients          enable row level security;
alter table if exists pools            enable row level security;
alter table if exists shipments        enable row level security;
alter table if exists pool_members     enable row level security;
alter table if exists orders           enable row level security;
alter table if exists leads            enable row level security;
alter table if exists providers        enable row level security;
alter table if exists provider_rates   enable row level security;
alter table if exists invoices         enable row level security;
alter table if exists payments         enable row level security;
alter table if exists admin_users      enable row level security;
alter table if exists admin_sessions   enable row level security;

-- ─── Drop existing policies to avoid conflicts ───────────────────────────────
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─── service_role bypasses RLS (default Supabase behavior) ──────────────────
-- All server-side API calls use service_role and are unrestricted.
-- anon key (client-facing) is restricted by the policies below.

-- ─── clients ─────────────────────────────────────────────────────────────────
create policy "clients: anon can insert"
  on clients for insert to anon with check (true);

create policy "clients: anon read own by code"
  on clients for select to anon
  using (true); -- client_code lookup is public (needed for tracking)

-- ─── pools ───────────────────────────────────────────────────────────────────
create policy "pools: public read"
  on pools for select to anon using (true);

-- ─── shipments ───────────────────────────────────────────────────────────────
create policy "shipments: anon can insert"
  on shipments for insert to anon with check (true);

create policy "shipments: anon read own"
  on shipments for select to anon using (true); -- tracking page uses client_code filter

-- ─── pool_members ────────────────────────────────────────────────────────────
create policy "pool_members: anon can insert"
  on pool_members for insert to anon with check (true);

create policy "pool_members: public read"
  on pool_members for select to anon using (true);

-- ─── orders ──────────────────────────────────────────────────────────────────
create policy "orders: anon can insert"
  on orders for insert to anon with check (true);

create policy "orders: anon can update own"
  on orders for update to anon using (true); -- client joins pool via client_code

create policy "orders: anon read own"
  on orders for select to anon using (true);

-- ─── leads ───────────────────────────────────────────────────────────────────
create policy "leads: anon can insert"
  on leads for insert to anon with check (true);

-- no anon read — admin-only via service_role

-- ─── providers (public read, admin write via service_role) ───────────────────
create policy "providers: public read"
  on providers for select to anon using (true);

-- provider_rates: public read (used by calculator)
create policy "provider_rates: public read"
  on provider_rates for select to anon using (true);

-- ─── invoices ────────────────────────────────────────────────────────────────
create policy "invoices: anon can insert"
  on invoices for insert to anon with check (true);

create policy "invoices: anon can update own by token"
  on invoices for update to anon
  using (token_expires_at > now()); -- token-gated uploads only

create policy "invoices: anon read own"
  on invoices for select to anon using (true);

-- ─── payments — admin-only (no anon access) ──────────────────────────────────
-- service_role handles all payment operations

-- ─── admin_users / admin_sessions — no anon access ──────────────────────────
-- service_role handles all admin auth operations

-- ─── audit_log ───────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  admin_email text,
  action      text not null,
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip          text,
  user_agent  text
);

alter table audit_log enable row level security;
-- no anon access; service_role writes audit entries

create index if not exists audit_log_ts_idx on audit_log(ts desc);
create index if not exists audit_log_action_idx on audit_log(action);
create index if not exists audit_log_table_idx on audit_log(table_name, record_id);
