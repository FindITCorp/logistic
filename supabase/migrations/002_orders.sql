-- Orders: pre-registered by client before package arrives at warehouse
create type order_status as enum (
  'ordered',               -- cliente registró el pedido
  'in_transit_to_warehouse', -- proveedor despachó, en camino a bodega
  'at_warehouse',          -- llegó a bodega FINDIT China
  'in_pool',               -- asignado a pool, precio confirmado
  'in_transit_to_panama',  -- barco zarpó
  'at_customs',            -- llegó a Panamá, en aduana
  'ready_for_pickup',      -- listo para retiro
  'delivered'              -- entregado al cliente
);

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references clients(id),
  client_code           text not null,
  supplier_tracking     text,             -- tracking del proveedor (AliExpress, 1688, etc.)
  supplier_name         text,             -- nombre del proveedor
  product_description   text not null,
  origin_city           origin_city not null default 'guangzhou',
  declared_value_usd    numeric(10,2),
  estimated_weight_kg   numeric(8,3),
  estimated_volume_m3   numeric(8,3),
  status                order_status not null default 'ordered',
  -- linked when arrives at warehouse
  shipment_id           uuid references shipments(id),
  -- filled when assigned to pool
  pool_id               uuid references pools(id),
  price_per_m3          numeric(8,2),
  -- timestamps per status
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
create policy "orders_insert" on orders for insert with check (true);
create policy "orders_read"   on orders for select using (true);
create policy "orders_update" on orders for update using (true);
