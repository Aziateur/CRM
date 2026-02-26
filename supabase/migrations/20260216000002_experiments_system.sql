-- Phase 2: Experiments System
-- First-class experiment objects with variants and per-attempt assignment

-- ─── Experiments ───
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL DEFAULT '',
  primary_metric TEXT NOT NULL DEFAULT 'dm_engagement'
    CHECK (primary_metric IN ('dm_engagement', 'meeting_set', 'follow_up_accepted', 'custom')),
  success_definition TEXT DEFAULT '',
  sample_size_target INT NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  scope JSONB NOT NULL DEFAULT '{}',
  protocol TEXT DEFAULT '',
  conclusion TEXT,
  conclusion_type TEXT CHECK (conclusion_type IN ('adopt', 'iterate', 'discard')),
  source_review_id UUID REFERENCES call_reviews(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiments_all" ON experiments FOR ALL USING (true) WITH CHECK (true);

-- ─── Experiment Variants ───
CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_control BOOLEAN NOT NULL DEFAULT false,
  protocol TEXT DEFAULT '',
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_all" ON experiment_variants FOR ALL USING (true) WITH CHECK (true);

-- ─── Link attempts to experiments ───
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id),
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES experiment_variants(id);

CREATE INDEX IF NOT EXISTS idx_attempts_experiment ON attempts(experiment_id) WHERE experiment_id IS NOT NULL;

COMMENT ON TABLE experiments IS 'Structured A/B tests: hypothesis + protocol + sample size + variants';
COMMENT ON TABLE experiment_variants IS 'Control vs Test variants within an experiment';
