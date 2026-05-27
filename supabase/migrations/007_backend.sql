-- Migration 007: Admin auth + payments + pool lifecycle columns

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin sessions (token-based auth, 24h TTL)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  admin_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Payments log
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  stage        TEXT NOT NULL CHECK (stage IN ('advance', 'final')),
  amount_usd   NUMERIC(10,2) NOT NULL,
  method       TEXT NOT NULL CHECK (method IN ('yappy', 'bank_transfer', 'cash', 'other')),
  reference    TEXT,
  notes        TEXT,
  recorded_by  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Add payment timestamp columns to shipments if missing
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS advance_paid_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_paid_at    TIMESTAMPTZ;

-- Add locked_at and day_joined to pool_members for cron-based price locking
ALTER TABLE pool_members
  ADD COLUMN IF NOT EXISTS day_joined  INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_at  TIMESTAMPTZ;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_shipment ON payments(shipment_id);

-- Auto-cleanup expired sessions (called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
  DELETE FROM admin_sessions WHERE expires_at < NOW();
$$ LANGUAGE sql;
