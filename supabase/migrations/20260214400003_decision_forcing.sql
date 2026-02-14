-- Phase 5: Decision Output Forcing
-- Every review should produce a decision artifact

ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS decision_type TEXT CHECK (decision_type IN ('rule_draft', 'experiment', 'drill', 'no_decision')),
  ADD COLUMN IF NOT EXISTS decision_payload JSONB DEFAULT '{}';

COMMENT ON COLUMN call_reviews.decision_type IS 'Required decision: rule_draft, experiment, drill, or no_decision';
COMMENT ON COLUMN call_reviews.decision_payload IS 'Details: {reason} for no_decision, {ifWhen, then, because} for rule_draft, etc.';
