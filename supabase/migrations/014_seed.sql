-- ── Seed initial data (idempotent) ──────────────────────────────────────────
-- Creates one active pool per origin if none exist, and a default provider.

-- Default provider (forwarder)
INSERT INTO providers (name, contact_name, contact_whatsapp, email, origin_city, rate_per_m3_usd, is_active)
VALUES ('Dragon Freight Guangzhou', 'Wei Zhang', '+8613800138001', 'ops@dragonfreight.cn', 'guangzhou', 85.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO providers (name, contact_name, contact_whatsapp, email, origin_city, rate_per_m3_usd, is_active)
VALUES ('Shanghai Express Logistics', 'Li Mei', '+8613900139001', 'ops@shangexpress.cn', 'shanghai', 90.00, true)
ON CONFLICT DO NOTHING;

-- Active pools — only create if there are zero active pools per route
DO $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'guangzhou' AND status = 'active') THEN
    INSERT INTO pools (origin_city, destination_city, status, day_number, current_volume_m3, max_volume_m3, reference_price_usd, opened_at)
    VALUES ('guangzhou', 'colon', 'active', 1, 0, 60, 285.00, v_now);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'shanghai' AND status = 'active') THEN
    INSERT INTO pools (origin_city, destination_city, status, day_number, current_volume_m3, max_volume_m3, reference_price_usd, opened_at)
    VALUES ('shanghai', 'colon', 'active', 1, 0, 60, 285.00, v_now);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pools WHERE origin_city = 'shenzhen' AND status = 'active') THEN
    INSERT INTO pools (origin_city, destination_city, status, day_number, current_volume_m3, max_volume_m3, reference_price_usd, opened_at)
    VALUES ('shenzhen', 'colon', 'active', 1, 0, 60, 285.00, v_now);
  END IF;
END $$;
