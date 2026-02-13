-- Add is_primary flag to contacts table so primary contact is persisted
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Ensure only one primary per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_one_primary
  ON contacts (lead_id) WHERE is_primary = true;
