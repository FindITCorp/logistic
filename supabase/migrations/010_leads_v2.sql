-- Migration 010: Extend leads table with pool tracking and source attribution

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pool_id  UUID REFERENCES pools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source   TEXT DEFAULT 'landing';  -- landing | join_modal | referral | manual

CREATE INDEX IF NOT EXISTS idx_leads_pool   ON leads(pool_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
