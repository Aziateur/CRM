-- Phase 1: Decision Buckets
-- Let users explicitly mark calls as Top/Bottom (human judgment vs computed ranking)

ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS call_bucket TEXT 
    CHECK (call_bucket IN ('top', 'bottom'));

COMMENT ON COLUMN call_reviews.call_bucket IS 'Manual human judgment: top (deep dive candidate) or bottom (avoid pattern). NULL = no explicit bucket.';

CREATE INDEX IF NOT EXISTS idx_cr_bucket ON call_reviews(call_bucket) WHERE call_bucket IS NOT NULL;
