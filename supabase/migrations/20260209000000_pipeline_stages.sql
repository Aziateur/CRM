-- Pipeline Stages: configurable sales pipeline for Kanban board
-- Phase 1 of pipeline-tasks-custom-fields plan

-- 1. Create pipeline_stages configuration table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    position INT NOT NULL DEFAULT 0,
    default_probability INT DEFAULT 0 CHECK (default_probability >= 0 AND default_probability <= 100),
    color TEXT DEFAULT '#6b7280',
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default stages
INSERT INTO pipeline_stages (name, position, default_probability, color, is_won, is_lost) VALUES
    ('New',            0,   0, '#6b7280', false, false),
    ('Contacted',      1,  10, '#3b82f6', false, false),
    ('Interested',     2,  30, '#8b5cf6', false, false),
    ('Meeting Booked', 3,  60, '#f59e0b', false, false),
    ('Won',            4, 100, '#22c55e', true,  false),
    ('Lost',           5,   0, '#ef4444', false, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Add stage columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'New';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value NUMERIC(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS close_probability INT CHECK (close_probability IS NULL OR (close_probability >= 0 AND close_probability <= 100));

-- 4. Index for Kanban queries (filter by stage)
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

-- 5. Enable RLS but allow anon access (no auth)
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to pipeline_stages"
    ON pipeline_stages FOR ALL
    USING (true)
    WITH CHECK (true);
