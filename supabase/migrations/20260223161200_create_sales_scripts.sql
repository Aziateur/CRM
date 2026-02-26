-- ============================================================
-- Migration: Create sales_scripts table
-- Purpose: Store structured sales scripts (NEPQ, etc.)
-- Each script is broken into stages, and each stage has sections.
-- ============================================================

-- Main script table
CREATE TABLE IF NOT EXISTS sales_scripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  methodology   TEXT,                  -- e.g. 'NEPQ'
  description   TEXT,
  target_audience TEXT,
  offer_summary TEXT,
  primary_goal  TEXT,
  secondary_goal TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Script stages (Stage 1, Stage 2, etc.)
CREATE TABLE IF NOT EXISTS sales_script_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
  stage_number  INT NOT NULL,
  title         TEXT NOT NULL,           -- e.g. 'THE CONNECTION STAGE'
  purpose       TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Individual sections within a stage (2A, 2B, etc.)
CREATE TABLE IF NOT EXISTS sales_script_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id      UUID NOT NULL REFERENCES sales_script_stages(id) ON DELETE CASCADE,
  section_code  TEXT,                    -- e.g. '1A', '2B', '5A'
  title         TEXT NOT NULL,           -- e.g. 'Problem Statement (Cold Call Opening)'
  content       TEXT NOT NULL,           -- The actual script text / dialogue
  coaching_notes TEXT,                   -- [Note: ...] coaching guidance
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Objection handlers (linked to a script)
CREATE TABLE IF NOT EXISTS sales_script_objections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
  objection     TEXT NOT NULL,           -- e.g. '"I need to think about it."'
  response      TEXT NOT NULL,           -- The handling script
  coaching_notes TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Key phrases / quick reference
CREATE TABLE IF NOT EXISTS sales_script_phrases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,           -- e.g. 'Disarming Language', 'Status Frames'
  phrase        TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stages_script ON sales_script_stages(script_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sections_stage ON sales_script_sections(stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_objections_script ON sales_script_objections(script_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_phrases_script ON sales_script_phrases(script_id, category, sort_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_scripts_updated_at ON sales_scripts;
CREATE TRIGGER trg_sales_scripts_updated_at
  BEFORE UPDATE ON sales_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_scripts_updated_at();
