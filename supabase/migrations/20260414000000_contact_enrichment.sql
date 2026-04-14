-- ============================================================================
-- Contact Enrichment: Add person-level fields to contacts table
-- All new columns are nullable — no breaking changes to existing data.
-- ============================================================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS seniority_level TEXT;

-- Index for quick contact lookups by lead
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
