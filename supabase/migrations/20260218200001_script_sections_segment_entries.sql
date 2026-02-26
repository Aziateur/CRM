-- ============================================================
-- Phase 2: Script sections (structured script blocks)
-- ============================================================

-- Rename kb_scripts.content → description
-- The actual talk track now lives in kb_script_sections, not in a flat field.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_scripts' AND column_name = 'content'
  ) THEN
    ALTER TABLE kb_scripts RENAME COLUMN content TO description;
  END IF;
END $$;

-- Script sections table
CREATE TABLE IF NOT EXISTS kb_script_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES kb_scripts(id) ON DELETE CASCADE,
  section_type_id UUID NOT NULL REFERENCES categories(id),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_script_sections_script ON kb_script_sections(script_id);
CREATE INDEX IF NOT EXISTS idx_script_sections_project ON kb_script_sections(project_id);

ALTER TABLE kb_script_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kb_script_sections_access" ON kb_script_sections;
CREATE POLICY "kb_script_sections_access" ON kb_script_sections
  FOR ALL USING (is_member_of(project_id));

-- ============================================================
-- Phase 3: Segment entries (Language Bank, Mindset, Market Recap)
-- ============================================================

CREATE TABLE IF NOT EXISTS segment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES categories(id),
  section_type_id UUID NOT NULL REFERENCES categories(id),
  title TEXT,
  content TEXT NOT NULL,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segment_entries_segment ON segment_entries(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_entries_section ON segment_entries(section_type_id);
CREATE INDEX IF NOT EXISTS idx_segment_entries_project ON segment_entries(project_id);

ALTER TABLE segment_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "segment_entries_access" ON segment_entries;
CREATE POLICY "segment_entries_access" ON segment_entries
  FOR ALL USING (is_member_of(project_id));
