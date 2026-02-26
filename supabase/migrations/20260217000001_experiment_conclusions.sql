-- Experiment conclusions + knowledge base linkage
-- Non-destructive: adds columns only, no data loss

-- 1. Add conclusion fields to experiments
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS winner_variant_id UUID REFERENCES experiment_variants(id),
  ADD COLUMN IF NOT EXISTS conclusion_summary TEXT,
  ADD COLUMN IF NOT EXISTS promoted_rule_id UUID REFERENCES rules(id);

-- 2. Link rules to their source experiment
ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS source_experiment_id UUID REFERENCES experiments(id);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rules_source_experiment ON rules(source_experiment_id) WHERE source_experiment_id IS NOT NULL;
