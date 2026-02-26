-- ────────────────────────────────────────────────────────────────
-- Schema Rationalization Migration
-- Non-destructive: adds columns, backfills data, adds deprecation comments
-- ────────────────────────────────────────────────────────────────

-- 1. Add computed_score cache column (optional perf optimization)
ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS computed_score NUMERIC,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '[]';

-- 2. Mark legacy columns as deprecated (documentation only, no data loss)
COMMENT ON COLUMN call_reviews.score_opening IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.score_discovery IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.score_control IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.score_objections IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.score_close IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.score_next_step IS 'DEPRECATED: Use responses JSONB + template fields for scoring';
COMMENT ON COLUMN call_reviews.total_score IS 'DEPRECATED: Use computed_score or calculate from responses + template fields';
COMMENT ON COLUMN call_reviews.what_worked IS 'DEPRECATED: Use responses JSONB with key "what_worked"';
COMMENT ON COLUMN call_reviews.what_failed IS 'DEPRECATED: Use responses JSONB with key "what_failed"';
COMMENT ON COLUMN call_reviews.coaching_notes IS 'DEPRECATED: Use responses JSONB with key "coaching_notes"';

-- 3. Mark experiments.active as deprecated (use status column instead)
COMMENT ON COLUMN experiments.active IS 'DEPRECATED: Use status column instead';

-- 4. Backfill template_version for reviews that have template_id but no version
UPDATE call_reviews cr
  SET template_version = (
    SELECT version FROM review_templates rt WHERE rt.id = cr.template_id
  )
  WHERE cr.template_id IS NOT NULL AND cr.template_version IS NULL;

-- 5. Create index on call_reviews for the common query pattern
CREATE INDEX IF NOT EXISTS idx_call_reviews_project_type
  ON call_reviews (project_id, review_type)
  WHERE review_type = 'quick';

-- 6. Create index on experiments for project lookup
CREATE INDEX IF NOT EXISTS idx_experiments_project_status
  ON call_reviews (project_id)
  WHERE review_type IS NOT NULL;
