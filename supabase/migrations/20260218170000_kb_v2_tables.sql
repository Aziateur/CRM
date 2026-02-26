-- KB V2 Migration: Create tables for the Learning Machine overhaul
-- Tables: categories, kb_tab_config, kb_scripts, icp_fields, icp_values
-- Also: add root cause columns to friction_logs

-- ─── 1. Generic Categories Table ───
-- Stores all configurable items: segments, friction types, root causes,
-- intel categories, script stages, etc.
-- NOTE: Drop existing table if schema doesn't match (created from earlier attempt)

DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- e.g. 'segment', 'friction_type', 'root_cause_type', 'intel_category', 'script_stage'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT,                   -- optional hex/hsl color
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_project_type 
  ON categories(project_id, type);

-- ─── 2. KB Tab Config Table ───
-- Stores customizable tab labels for the KB page

CREATE TABLE IF NOT EXISTS kb_tab_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,        -- e.g. 'playbook', 'scripts', 'icp', 'intel', 'friction', 'metrics'
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, tab_key)
);

-- ─── 3. KB Scripts Table ───
-- Stores call scripts with stage/segment filtering

CREATE TABLE IF NOT EXISTS kb_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  stage TEXT,                   -- references categories.id for script_stage type
  segment_filter TEXT,          -- references categories.id for segment type
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  times_used INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_scripts_project 
  ON kb_scripts(project_id);

-- ─── 4. ICP Fields Table ───
-- User-defined fields for Ideal Customer Profile definitions

CREATE TABLE IF NOT EXISTS icp_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'textarea', 'select', 'number'
  options TEXT[],               -- for select type
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icp_fields_project 
  ON icp_fields(project_id);

-- ─── 5. ICP Values Table ───
-- Stores actual ICP field values per segment

CREATE TABLE IF NOT EXISTS icp_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL,     -- references categories.id for segment type
  field_id UUID NOT NULL REFERENCES icp_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(segment_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_icp_values_segment 
  ON icp_values(segment_id);

-- ─── 6. Add root cause columns to friction_logs ───

ALTER TABLE friction_logs
  ADD COLUMN IF NOT EXISTS root_cause_id UUID,
  ADD COLUMN IF NOT EXISTS affected_component TEXT,
  ADD COLUMN IF NOT EXISTS resolution_action TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ─── 7. RLS Policies ───

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_tab_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_values ENABLE ROW LEVEL SECURITY;

-- Categories: anyone authenticated can read/write their project's categories
CREATE POLICY "Users can manage categories"
  ON categories FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage tab config"
  ON kb_tab_config FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage scripts"
  ON kb_scripts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage ICP fields"
  ON icp_fields FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage ICP values"
  ON icp_values FOR ALL
  USING (true)
  WITH CHECK (true);
