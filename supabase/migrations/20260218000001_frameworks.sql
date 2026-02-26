-- Migrate framework system from localStorage to Supabase.
-- Framework = Phases + Levers + Markers, with cross-references.
-- One active framework per project (version 4 format).

-- ─── Frameworks (root object) ───
CREATE TABLE IF NOT EXISTS frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_phase_key TEXT NOT NULL,
  signals_started_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)  -- one framework per project
);

ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "frameworks_all" ON frameworks;
CREATE POLICY "frameworks_all" ON frameworks FOR ALL USING (true) WITH CHECK (true);

-- ─── Framework Levers ───
CREATE TABLE IF NOT EXISTS framework_levers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  prompt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, key)
);

ALTER TABLE framework_levers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "framework_levers_all" ON framework_levers;
CREATE POLICY "framework_levers_all" ON framework_levers FOR ALL USING (true) WITH CHECK (true);

-- ─── Framework Markers ───
CREATE TABLE IF NOT EXISTS framework_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  definition TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, key)
);

ALTER TABLE framework_markers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "framework_markers_all" ON framework_markers;
CREATE POLICY "framework_markers_all" ON framework_markers FOR ALL USING (true) WITH CHECK (true);

-- ─── Framework Phases ───
CREATE TABLE IF NOT EXISTS framework_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  why_text TEXT NOT NULL DEFAULT '',
  do_text TEXT NOT NULL DEFAULT '',
  win_text TEXT NOT NULL DEFAULT '',
  focus_lever_key TEXT NOT NULL,
  action_marker_key TEXT,
  win_marker_key TEXT,
  primary_goal TEXT NOT NULL DEFAULT 'reps'
    CHECK (primary_goal IN ('reps', 'action', 'win', 'outcome_meetings')),
  target INT NOT NULL DEFAULT 40,
  period JSONB NOT NULL DEFAULT '{"type":"iso_week"}',
  exit_criteria TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, key)
);

ALTER TABLE framework_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "framework_phases_all" ON framework_phases;
CREATE POLICY "framework_phases_all" ON framework_phases FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_frameworks_project ON frameworks(project_id);
CREATE INDEX IF NOT EXISTS idx_framework_levers_framework ON framework_levers(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_markers_framework ON framework_markers(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_phases_framework ON framework_phases(framework_id);

COMMENT ON TABLE frameworks IS 'Root framework config per project. Replaces localStorage crm_framework_v4.';
