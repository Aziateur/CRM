-- Phase 5 + 6: Review System Tables
-- Tables for call reviews (Quick Batch + Deep Dive) and playbook evidence linking

-- 1. Call reviews — one per call, supports both quick and deep review types
CREATE TABLE IF NOT EXISTS call_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES call_sessions(id),
  attempt_id UUID REFERENCES attempts(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('quick', 'deep')),
  
  -- Quick Batch fields
  tags TEXT[],
  market_insight TEXT,
  promote_to_playbook BOOLEAN DEFAULT FALSE,
  
  -- Deep Dive fields (rubric scoring 1-5)
  score_opening INT CHECK (score_opening BETWEEN 1 AND 5),
  score_discovery INT CHECK (score_discovery BETWEEN 1 AND 5),
  score_control INT CHECK (score_control BETWEEN 1 AND 5),
  score_objections INT CHECK (score_objections BETWEEN 1 AND 5),
  score_close INT CHECK (score_close BETWEEN 1 AND 5),
  score_next_step INT CHECK (score_next_step BETWEEN 1 AND 5),
  total_score NUMERIC GENERATED ALWAYS AS (
    COALESCE(score_opening, 0) + COALESCE(score_discovery, 0) + COALESCE(score_control, 0) +
    COALESCE(score_objections, 0) + COALESCE(score_close, 0) + COALESCE(score_next_step, 0)
  ) STORED,
  what_worked TEXT,
  what_failed TEXT,
  coaching_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_cr_attempt ON call_reviews(attempt_id);
CREATE INDEX IF NOT EXISTS idx_cr_type ON call_reviews(review_type);

-- RLS
ALTER TABLE call_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_reviews_select" ON call_reviews
  FOR SELECT USING (is_member_of(project_id));
CREATE POLICY "call_reviews_insert" ON call_reviews
  FOR INSERT WITH CHECK (is_member_of(project_id));
CREATE POLICY "call_reviews_update" ON call_reviews
  FOR UPDATE USING (is_member_of(project_id));
CREATE POLICY "call_reviews_delete" ON call_reviews
  FOR DELETE USING (is_member_of(project_id));

-- 2. Playbook evidence — links rules to specific calls
CREATE TABLE IF NOT EXISTS playbook_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES call_sessions(id),
  attempt_id UUID REFERENCES attempts(id),
  snippet_text TEXT,
  timestamp_start NUMERIC,
  timestamp_end NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_pe_rule ON playbook_evidence(rule_id);
CREATE INDEX IF NOT EXISTS idx_pe_attempt ON playbook_evidence(attempt_id);

-- RLS
ALTER TABLE playbook_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playbook_evidence_select" ON playbook_evidence
  FOR SELECT USING (is_member_of(project_id));
CREATE POLICY "playbook_evidence_insert" ON playbook_evidence
  FOR INSERT WITH CHECK (is_member_of(project_id));
CREATE POLICY "playbook_evidence_update" ON playbook_evidence
  FOR UPDATE USING (is_member_of(project_id));
CREATE POLICY "playbook_evidence_delete" ON playbook_evidence
  FOR DELETE USING (is_member_of(project_id));
