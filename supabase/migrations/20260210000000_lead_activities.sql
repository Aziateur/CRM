-- Lead Activities: timeline events per lead (notes, stage changes, field edits, etc.)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'stage_change', 'field_edit', 'created', 'imported')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead_id ON lead_activities (lead_id);
CREATE INDEX idx_lead_activities_created_at ON lead_activities (created_at DESC);

-- Enable RLS with anon access (matches existing pattern — no auth)
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON lead_activities FOR ALL USING (true) WITH CHECK (true);
