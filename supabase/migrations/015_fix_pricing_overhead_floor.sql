-- 015_fix_pricing_overhead_floor.sql
-- Corrección: aumentar MIN_OVERHEAD_VOLUME_M3 de 5 → 8 en la función SQL.
-- Con floor=5: overhead=$124/m³, minClientPrice=$261.8 > $252 (cap violado).
-- Con floor=8: overhead=$77.5/m³, minClientPrice=$215.3 < $252 (cap respetado).
-- Sincroniza con el cambio en lib/pricing.ts (MIN_OVERHEAD_VOLUME_M3=8).

create or replace function findit_client_price(p_day int, p_volume numeric)
returns numeric language plpgsql immutable as $$
declare
  v_carrier       numeric := findit_carrier_rate(p_volume);
  v_overhead      numeric := 620.0 / greatest(greatest(p_volume, 1), 8);
  v_total         numeric := v_carrier + v_overhead;
  v_floor         numeric := v_carrier * 0.30;
  v_min           numeric := v_total + v_floor;
  v_max           numeric := greatest(252, v_min);
  v_distributable numeric := greatest(0, v_max - v_min);
  v_day           int     := least(greatest(p_day, 1), 10);
  v_pct           numeric;
begin
  v_pct := case v_day
    when 1 then 90 when 2 then 80 when 3 then 70 when 4 then 60 when 5 then 50
    when 6 then 40 when 7 then 30 when 8 then 20 when 9 then 10 else 10 end;
  return round(v_max - v_distributable * v_pct / 100.0, 2);
end;
$$;
