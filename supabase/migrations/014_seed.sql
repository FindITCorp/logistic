-- ── Seed inicial idempotente ─────────────────────────────────────────────────
-- Inserta 2 proveedores, sus tarifas y 3 pools activos (uno por ruta).

-- Proveedores
INSERT INTO providers (name, contact_name, contact_whatsapp, contact_email, is_active)
VALUES ('Dragon Freight Guangzhou', 'Wei Zhang', '+8613800138001', 'ops@dragonfreight.cn', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO providers (name, contact_name, contact_whatsapp, contact_email, is_active)
VALUES ('Shanghai Express Logistics', 'Li Mei', '+8613900139001', 'ops@shangexpress.cn', true)
ON CONFLICT (name) DO NOTHING;

-- Tarifas por volumen (tramos LCL según motor de precios)
DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM providers WHERE name = 'Dragon Freight Guangzhou';
  IF v_id IS NOT NULL THEN
    INSERT INTO provider_rates (provider_id, origin_city, min_volume_m3, max_volume_m3, rate_per_m3)
    VALUES (v_id,'guangzhou',0,5,100),(v_id,'guangzhou',5,15,92),
           (v_id,'guangzhou',15,20,87),(v_id,'guangzhou',20,null,82),
           (v_id,'shenzhen',0,5,100),(v_id,'shenzhen',5,15,92),
           (v_id,'shenzhen',15,20,87),(v_id,'shenzhen',20,null,82)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_id FROM providers WHERE name = 'Shanghai Express Logistics';
  IF v_id IS NOT NULL THEN
    INSERT INTO provider_rates (provider_id, origin_city, min_volume_m3, max_volume_m3, rate_per_m3)
    VALUES (v_id,'shanghai',0,5,100),(v_id,'shanghai',5,15,92),
           (v_id,'shanghai',15,20,87),(v_id,'shanghai',20,null,82)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Pools activos — uno por ruta si no existe ninguno activo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'guangzhou' AND status = 'active') THEN
    INSERT INTO pools (origin_city, status, day_number, current_volume_m3, reference_price_m3, opened_at)
    VALUES ('guangzhou','active',1,0,285.00,now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'shanghai' AND status = 'active') THEN
    INSERT INTO pools (origin_city, status, day_number, current_volume_m3, reference_price_m3, opened_at)
    VALUES ('shanghai','active',1,0,285.00,now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'shenzhen' AND status = 'active') THEN
    INSERT INTO pools (origin_city, status, day_number, current_volume_m3, reference_price_m3, opened_at)
    VALUES ('shenzhen','active',1,0,285.00,now());
  END IF;
END $$;
