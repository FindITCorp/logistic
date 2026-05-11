-- ============================================================
-- FINDIT — Esquema inicial
-- ============================================================

-- Habilitar extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- Tabla: profiles (extiende auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  company     text,
  role        text not null default 'client' check (role in ('client', 'operator', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios editan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, company)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Tabla: pools
-- ============================================================
create table public.pools (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  status               text not null default 'open'
                         check (status in ('open', 'closed', 'in_transit', 'delivered')),
  open_date            timestamptz not null,
  close_date           timestamptz not null,
  current_volume_m3    numeric(10,3) not null default 0,
  max_volume_m3        numeric(10,3) not null default 15,
  current_rate_per_m3  numeric(10,2) not null default 280,
  base_market_rate     numeric(10,2) not null default 600,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.pools enable row level security;

-- Lectura pública de pools
create policy "Pools son visibles públicamente"
  on public.pools for select
  using (true);

-- Solo operadores/admin crean o editan pools
create policy "Operadores gestionan pools"
  on public.pools for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('operator', 'admin')
    )
  );

-- ============================================================
-- Tabla: shipments (cargas en un pool)
-- ============================================================
create table public.shipments (
  id               uuid primary key default uuid_generate_v4(),
  pool_id          uuid not null references public.pools(id) on delete restrict,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  description      text not null,
  weight_kg        numeric(10,3) not null,
  volume_m3        numeric(10,6) not null,
  billable_m3      numeric(10,6) not null,
  rate_locked_at   numeric(10,2),
  total_amount     numeric(10,2),
  status           text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'in_transit', 'delivered')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.shipments enable row level security;

create policy "Clientes ven sus propios envíos"
  on public.shipments for select
  using (auth.uid() = user_id);

create policy "Clientes crean envíos"
  on public.shipments for insert
  with check (auth.uid() = user_id);

create policy "Operadores ven todos los envíos"
  on public.shipments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('operator', 'admin')
    )
  );

-- Trigger: actualizar volumen del pool al insertar envío
create or replace function public.update_pool_volume()
returns trigger language plpgsql security definer as $$
begin
  update public.pools
  set
    current_volume_m3 = current_volume_m3 + new.billable_m3,
    updated_at = now()
  where id = new.pool_id;
  return new;
end;
$$;

create trigger on_shipment_created
  after insert on public.shipments
  for each row execute procedure public.update_pool_volume();

-- ============================================================
-- Tabla: pre_registrations
-- ============================================================
create table public.pre_registrations (
  id                 uuid primary key default uuid_generate_v4(),
  email              text not null unique,
  name               text,
  company            text,
  monthly_volume_m3  numeric(10,3),
  current_rate       numeric(10,2),
  created_at         timestamptz not null default now()
);

alter table public.pre_registrations enable row level security;

-- Solo service role puede leer/escribir pre-registros
create policy "Service role gestiona pre-registros"
  on public.pre_registrations for all
  using (false)
  with check (false);

-- ============================================================
-- Índices
-- ============================================================
create index pools_status_idx on public.pools(status);
create index pools_close_date_idx on public.pools(close_date);
create index shipments_pool_id_idx on public.shipments(pool_id);
create index shipments_user_id_idx on public.shipments(user_id);
