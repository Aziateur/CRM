-- Phase 3: Playbook Promotion
-- Prevent duplicate evidence rows for the same rule + attempt
-- Track which review created a rule

CREATE UNIQUE INDEX IF NOT EXISTS idx_pe_rule_attempt
  ON playbook_evidence(rule_id, attempt_id);

-- Rules source tracking (was this rule created from a review?)
ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS source_review_id UUID REFERENCES call_reviews(id);
