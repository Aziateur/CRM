-- Tags: colored labels for categorizing leads
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tags_name ON tags (name);

-- Lead-Tag join table (many-to-many)
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

CREATE INDEX idx_lead_tags_lead_id ON lead_tags (lead_id);
CREATE INDEX idx_lead_tags_tag_id ON lead_tags (tag_id);

-- Enable RLS with anon access (no auth in this project)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON tags FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON lead_tags FOR ALL USING (true) WITH CHECK (true);
