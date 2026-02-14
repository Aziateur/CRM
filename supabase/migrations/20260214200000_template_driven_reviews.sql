-- Template-Driven Review System
-- Phase 1: review_templates + review_fields tables
-- Phase 2: Calibration anchors in field config
-- Phase 3: Evidence anchoring via evidence_snippets on call_reviews

-- ─── 1. Review Templates ───
CREATE TABLE IF NOT EXISTS review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('quick', 'deep', 'both')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_rt_project ON review_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_rt_active ON review_templates(is_active) WHERE is_active = true;

ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rt_select" ON review_templates FOR SELECT USING (is_member_of(project_id));
CREATE POLICY "rt_insert" ON review_templates FOR INSERT WITH CHECK (is_member_of(project_id));
CREATE POLICY "rt_update" ON review_templates FOR UPDATE USING (is_member_of(project_id));
CREATE POLICY "rt_delete" ON review_templates FOR DELETE USING (is_member_of(project_id));

-- ─── 2. Review Fields (dimensions, text fields, evidence fields, etc.) ───
CREATE TABLE IF NOT EXISTS review_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,          -- stable key for querying (e.g., "opening", "discovery")
  label TEXT NOT NULL,        -- display label (e.g., "Opening Hook")
  field_type TEXT NOT NULL CHECK (field_type IN (
    'score',          -- numeric 1-5 with calibration anchors
    'text',           -- free-text field
    'multi_select',   -- tag-like multi-select
    'checkbox',       -- boolean toggle
    'evidence_quote'  -- transcript snippet with timestamps
  )),
  section TEXT,               -- grouping (e.g., "Connection", "Frame", "Discovery")
  config JSONB NOT NULL DEFAULT '{}',
  -- For 'score' fields, config contains:
  --   { "min": 1, "max": 5, "anchors": { "1": "...", "3": "...", "5": "..." } }
  -- For 'multi_select', config contains:
  --   { "options": [{"value": "...", "label": "...", "color": "..."}] }
  -- For 'evidence_quote', config contains:
  --   { "prompt": "Select the transcript lines that support this observation" }
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_rf_template ON review_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_rf_order ON review_fields(template_id, sort_order);

ALTER TABLE review_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rf_select" ON review_fields FOR SELECT USING (is_member_of(project_id));
CREATE POLICY "rf_insert" ON review_fields FOR INSERT WITH CHECK (is_member_of(project_id));
CREATE POLICY "rf_update" ON review_fields FOR UPDATE USING (is_member_of(project_id));
CREATE POLICY "rf_delete" ON review_fields FOR DELETE USING (is_member_of(project_id));

-- ─── 3. Extend call_reviews for template-driven responses ───
ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES review_templates(id),
  ADD COLUMN IF NOT EXISTS template_version INT,
  ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_snippets JSONB DEFAULT '[]';
-- responses format: { "field_key": value, ... }
--   For 'score' fields: { "opening": 4 }
--   For 'text' fields: { "what_worked": "..." }
--   For 'evidence_quote' fields: { "opening_evidence": { "text": "...", "start_ts": 14, "end_ts": 33 } }
-- evidence_snippets format: [{ "field_key": "...", "text": "...", "start_ts": 14, "end_ts": 33, "transcript_lines": [3,4,5] }]

CREATE INDEX IF NOT EXISTS idx_cr_template ON call_reviews(template_id);

-- ─── 4. Seed default "Cold Call v1" template ───
-- This uses a DO block so it's idempotent per project
DO $$
DECLARE
  proj RECORD;
  tmpl_id UUID;
BEGIN
  FOR proj IN SELECT id FROM projects LOOP
    -- Check if template already exists for this project
    SELECT id INTO tmpl_id FROM review_templates
      WHERE project_id = proj.id AND name = 'Cold Call v1' AND version = 1;

    IF tmpl_id IS NULL THEN
      INSERT INTO review_templates (name, description, version, is_active, applies_to, project_id)
        VALUES ('Cold Call v1', 'Default cold call review rubric with calibration anchors', 1, true, 'deep', proj.id)
        RETURNING id INTO tmpl_id;

      -- Opening
      INSERT INTO review_fields (template_id, key, label, field_type, section, sort_order, is_required, config, project_id) VALUES
      (tmpl_id, 'opening', 'Opening Hook', 'score', 'Connection', 0, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "No clear hook; generic intro; no reason to stay on the line",
          "2": "Attempted hook but vague; sounds like every other cold call",
          "3": "Hook exists but weak specificity; creates some curiosity",
          "4": "Specific hook with relevance; prospect pauses to listen",
          "5": "Pattern interrupt + immediate relevance + curiosity gap; prospect engages"
        }
      }'::jsonb, proj.id),

      -- Discovery
      (tmpl_id, 'discovery', 'Discovery Quality', 'score', 'Discovery', 1, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "No questions asked; pitched immediately after opener",
          "2": "Surface-level questions; didn''t follow up on answers",
          "3": "Good initial questions; missed follow-up opportunities",
          "4": "Layered questions that uncovered real pain; listened well",
          "5": "Deep discovery — prospect revealed things they hadn''t considered; emotional pain surfaced"
        }
      }'::jsonb, proj.id),

      -- Frame Control
      (tmpl_id, 'control', 'Frame Control', 'score', 'Frame', 2, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "Lost control immediately; prospect ran the call",
          "2": "Some structure but let prospect derail frequently",
          "3": "Maintained basic structure; redirected once or twice",
          "4": "Clear call structure; guided conversation naturally",
          "5": "Total control — set frame early, redirected smoothly, prospect followed"
        }
      }'::jsonb, proj.id),

      -- Objection Handling
      (tmpl_id, 'objections', 'Objection Handling', 'score', 'Frame', 3, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "Folded at first objection; no reframe attempted",
          "2": "Acknowledged objection but gave a weak, scripted response",
          "3": "Reframed with logic but didn''t create new perspective",
          "4": "Strong reframe that shifted prospect''s thinking; used empathy",
          "5": "Turned objection into a reason to continue; prospect thanked them for the perspective"
        }
      }'::jsonb, proj.id),

      -- Close
      (tmpl_id, 'close', 'Close Attempt', 'score', 'Close', 4, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "Never asked for anything; call ended with no request",
          "2": "Vague ask (''would you be open to...''); no urgency",
          "3": "Clear ask but bad timing or weak framing",
          "4": "Well-timed close with specific next step proposed",
          "5": "Assumptive close with calendar lock; prospect felt natural progression"
        }
      }'::jsonb, proj.id),

      -- Next Step
      (tmpl_id, 'next_step', 'Next Step Lock', 'score', 'Close', 5, true, '{
        "min": 1, "max": 5,
        "anchors": {
          "1": "No follow-up discussed; call ended ambiguously",
          "2": "Said ''I''ll follow up'' but no date/time",
          "3": "Proposed a follow-up but prospect was noncommittal",
          "4": "Confirmed specific date/time; sent calendar invite",
          "5": "Calendar locked + confirmation + pre-meeting agenda set"
        }
      }'::jsonb, proj.id),

      -- Evidence fields
      (tmpl_id, 'what_worked', 'What Worked', 'text', 'Analysis', 6, false, '{
        "placeholder": "What specific moves worked in this call? Reference exact moments.",
        "rows": 4
      }'::jsonb, proj.id),

      (tmpl_id, 'what_failed', 'What Failed', 'text', 'Analysis', 7, false, '{
        "placeholder": "Where did the call break down? Be specific — what line or moment?",
        "rows": 4
      }'::jsonb, proj.id),

      (tmpl_id, 'coaching_notes', 'Coaching Notes', 'text', 'Analysis', 8, false, '{
        "placeholder": "Key takeaways, drills to run, framework adjustments...",
        "rows": 4
      }'::jsonb, proj.id),

      -- Evidence quote field (Phase 3)
      (tmpl_id, 'key_moment', 'Key Moment', 'evidence_quote', 'Evidence', 9, false, '{
        "prompt": "Select the transcript lines that define the turning point of this call"
      }'::jsonb, proj.id);
    END IF;
  END LOOP;
END $$;
