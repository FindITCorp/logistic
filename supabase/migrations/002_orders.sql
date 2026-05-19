-- Orders: pre-registered by client before package arrives at warehouse (idempotent)
do $$ begin
  create type order_status as enum (
    'ordered',
    'in_transit_to_warehouse',
    'at_warehouse',
    'in_pool',
    'in_transit_to_panama',
    'at_customs',
    'ready_for_pickup',
    'delivered'
  );
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references clients(id),
  client_code           text not null,
  supplier_tracking     text,
  supplier_name         text,
  product_description   text not null,
  origin_city           origin_city not null default 'guangzhou',
  declared_value_usd    numeric(10,2),
  estimated_weight_kg   numeric(8,3),
  estimated_volume_m3   numeric(8,3),
  status                order_status not null default 'ordered',
  shipment_id           uuid references shipments(id),
  pool_id               uuid references pools(id),
  price_per_m3          numeric(8,2),
  ordered_at            timestamptz not null default now(),
  shipped_by_supplier_at timestamptz,
  arrived_warehouse_at  timestamptz,
  assigned_pool_at      timestamptz,
  shipped_to_panama_at  timestamptz,
  arrived_customs_at    timestamptz,
  ready_pickup_at       timestamptz,
  delivered_at          timestamptz,
  created_at            timestamptz not null default now()
);

alter table orders enable row level security;
do $$ begin create policy "orders_insert" on orders for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "orders_read"   on orders for select using (true);       exception when duplicate_object then null; end $$;
do $$ begin create policy "orders_update" on orders for update using (true);       exception when duplicate_object then null; end $$;
