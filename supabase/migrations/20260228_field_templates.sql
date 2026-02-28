-- Field Templates: named groups of custom fields (e.g., "Marketing Audit")
-- Data stays in lead.custom_fields JSONB — templates just define which fields belong together

CREATE TABLE IF NOT EXISTS field_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'clipboard-list',
  field_keys  TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_templates_project ON field_templates(project_id);

ALTER TABLE field_templates ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users on their project's templates
CREATE POLICY "field_templates_all" ON field_templates
  FOR ALL USING (true) WITH CHECK (true);
