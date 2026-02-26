-- View Presets: saved filter/sort/view combinations ("Smart Views")
CREATE TABLE IF NOT EXISTS view_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'lead',
  filters JSONB DEFAULT '{}',
  sort JSONB DEFAULT '{}',
  view_mode TEXT DEFAULT 'table',
  is_default BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_view_presets_entity_type ON view_presets (entity_type);

-- Enable RLS with anon access (matches existing pattern — no auth)
ALTER TABLE view_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON view_presets FOR ALL USING (true) WITH CHECK (true);
