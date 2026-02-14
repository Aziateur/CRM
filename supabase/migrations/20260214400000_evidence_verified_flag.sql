-- Phase 1: Evidence Gating
-- Add evidence_verified flag to call_reviews
-- true = recording OR transcript was present at review time
-- false = reviewed from memory / rep notes only

ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS evidence_verified BOOLEAN NOT NULL DEFAULT false;
