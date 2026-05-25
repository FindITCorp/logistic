-- 006_lifecycle.sql
-- Pool and shipment lifecycle: new statuses + payment/document tracking on shipments

-- ─── Extend pool_status enum ─────────────────────────────────────────────────
do $$ begin alter type pool_status add value 'in_transit'; exception when duplicate_object then null; end $$;
do $$ begin alter type pool_status add value 'at_colon';   exception when duplicate_object then null; end $$;
do $$ begin alter type pool_status add value 'at_tocumen'; exception when duplicate_object then null; end $$;
do $$ begin alter type pool_status add value 'completed';  exception when duplicate_object then null; end $$;

-- ─── Extend shipment_status enum ─────────────────────────────────────────────
do $$ begin alter type shipment_status add value 'in_transit'; exception when duplicate_object then null; end $$;
do $$ begin alter type shipment_status add value 'at_tocumen'; exception when duplicate_object then null; end $$;
do $$ begin alter type shipment_status add value 'delivered';  exception when duplicate_object then null; end $$;

-- ─── Payment & document tracking on shipments ─────────────────────────────────
alter table shipments
  add column if not exists declared_value    numeric(10,2) default null,
  add column if not exists invoice_received  boolean       not null default false,
  add column if not exists advance_paid      boolean       not null default false,
  add column if not exists advance_amount    numeric(10,2) default null,
  add column if not exists final_paid        boolean       not null default false,
  add column if not exists final_amount      numeric(10,2) default null,
  add column if not exists pickup_at         timestamptz   default null,
  add column if not exists notes             text          default null;

-- ─── Pool lifecycle timestamps ────────────────────────────────────────────────
alter table pools
  add column if not exists dispatched_at  timestamptz default null,
  add column if not exists arrived_colon_at timestamptz default null,
  add column if not exists arrived_tocumen_at timestamptz default null,
  add column if not exists completed_at   timestamptz default null;
