-- Seed: pools de demostración para desarrollo
insert into public.pools (name, status, open_date, close_date, current_volume_m3, max_volume_m3, current_rate_per_m3, base_market_rate)
values
  (
    'Pool China → Panamá — Jun 2026',
    'open',
    '2026-06-01T00:00:00Z',
    '2026-06-10T23:59:59Z',
    4.2,
    15,
    185,
    600
  ),
  (
    'Pool China → Panamá — Jun/2 2026',
    'open',
    '2026-06-11T00:00:00Z',
    '2026-06-21T23:59:59Z',
    1.5,
    15,
    280,
    600
  ),
  (
    'Pool China → Panamá — May 2026',
    'in_transit',
    '2026-05-01T00:00:00Z',
    '2026-05-10T23:59:59Z',
    12.3,
    15,
    150,
    600
  );
