-- ============================================================================
-- Field Aliases: Remember how CSV headers map to fields across imports
-- When a user maps "Employee Count" → company_size, we save that alias
-- so the next import auto-maps it without asking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,              -- CSV header (lowercased, trimmed)
  target_key TEXT NOT NULL,         -- field key it maps to (e.g. "company_size", "contact_first_name")
  target_entity TEXT NOT NULL DEFAULT 'lead',  -- 'lead' or 'contact'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_field_aliases_project ON field_aliases(project_id);

ALTER TABLE field_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_aliases_all" ON field_aliases FOR ALL USING (true) WITH CHECK (true);
