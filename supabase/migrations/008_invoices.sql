-- Migration 008: Invoice management for Panama customs

-- Invoices table — one per shipment, uploaded by client or admin
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_code      TEXT NOT NULL,
  pool_id          UUID REFERENCES pools(id) ON DELETE SET NULL,

  -- Document
  file_url         TEXT,                  -- Supabase Storage URL
  file_name        TEXT,
  file_size_bytes  INT,
  upload_token     TEXT UNIQUE,           -- one-time upload token (sent via WhatsApp)
  token_expires_at TIMESTAMPTZ,

  -- Declared goods
  declared_value_usd   NUMERIC(10,2),
  currency             TEXT DEFAULT 'USD',
  description          TEXT,              -- what the client says it is
  hs_code              TEXT,              -- Panama HS tariff code (admin fills)
  product_type         TEXT,             -- electronics, clothing, tools, etc.

  -- Customs computed fields (admin fills after reviewing invoice)
  cif_value_usd        NUMERIC(10,2),     -- cost + insurance + freight
  arancel_pct          NUMERIC(5,2),      -- import duty % (0–15)
  arancel_usd          NUMERIC(10,2),
  itbms_usd            NUMERIC(10,2),     -- 7% of (CIF + arancel)
  total_taxes_usd      NUMERIC(10,2),

  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','uploaded','reviewed','approved')),
  uploaded_at          TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ,
  reviewed_by          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Add product description and dimensions to shipments
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS product_description  TEXT,
  ADD COLUMN IF NOT EXISTS length_cm            NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS width_cm             NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS height_cm            NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS invoice_token        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_token_exp    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_uploaded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_url          TEXT;

-- Add product_description to orders as well
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipment_id          UUID REFERENCES shipments(id),
  ADD COLUMN IF NOT EXISTS arrived_warehouse_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_pool_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_shipment   ON invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pool       ON invoices(pool_id);
CREATE INDEX IF NOT EXISTS idx_invoices_token      ON invoices(upload_token);
CREATE INDEX IF NOT EXISTS idx_shipments_inv_token ON shipments(invoice_token);
