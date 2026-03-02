-- ============================================================================
-- STARTER DATA SEED: Education Lead Optimization
-- Run this in Supabase SQL Editor
-- ============================================================================
--
-- STEP 1: Find your project_id by running this first:
--
--   SELECT id, name FROM projects;
--
-- Then replace '<YOUR_PROJECT_ID>' below with the actual UUID.
-- ============================================================================

DO $$
DECLARE
  pid UUID := '<YOUR_PROJECT_ID>';  -- ← REPLACE THIS
  tmpl_id UUID;
  seq_id UUID;
  fw_id UUID;
BEGIN

  -- Verify project exists
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = pid) THEN
    RAISE EXCEPTION 'Project not found: %. Run SELECT id, name FROM projects; first.', pid;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 1. QUICK REVIEW TEMPLATE (you already have "Cold Call v1" for deep)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO review_templates (name, description, version, is_active, applies_to, project_id)
  VALUES ('Quick Batch v1', 'Fast post-call tagging + insight capture for batch review', 1, true, 'quick', pid)
  RETURNING id INTO tmpl_id;

  INSERT INTO review_fields (template_id, key, label, field_type, section, config, sort_order, is_required, project_id) VALUES
  -- Tags for quick classification
  (tmpl_id, 'call_tags', 'Call Tags', 'multi_select', 'Classification', '{
    "options": [
      {"value": "dm_reached", "label": "DM Reached", "color": "#22c55e"},
      {"value": "good_discovery", "label": "Good Discovery", "color": "#3b82f6"},
      {"value": "objection_handled", "label": "Objection Handled", "color": "#8b5cf6"},
      {"value": "meeting_booked", "label": "Meeting Booked", "color": "#f59e0b"},
      {"value": "callback_agreed", "label": "Callback Agreed", "color": "#06b6d4"},
      {"value": "no_interest", "label": "No Interest", "color": "#ef4444"},
      {"value": "wrong_person", "label": "Wrong Person", "color": "#6b7280"},
      {"value": "voicemail", "label": "Voicemail", "color": "#64748b"}
    ]
  }'::jsonb, 0, true, pid),

  -- Quick insight
  (tmpl_id, 'market_insight', 'Market Insight', 'text', 'Insight', '{
    "placeholder": "Anything you learned about this segment, their objections, or the market?",
    "rows": 2
  }'::jsonb, 1, false, pid),

  -- Promote checkbox
  (tmpl_id, 'promote_to_playbook', 'Add to Playbook?', 'checkbox', 'Insight', '{}'::jsonb, 2, false, pid),

  -- Quick score (1-5, no anchors needed)
  (tmpl_id, 'overall_feel', 'Overall Feel', 'score', 'Rating', '{
    "min": 1, "max": 5,
    "anchors": {
      "1": "Terrible — hung up, wrong approach, wasted call",
      "3": "Decent — got some info but no real traction",
      "5": "Nailed it — great conversation, clear next step"
    }
  }'::jsonb, 3, false, pid);

  RAISE NOTICE '✅ Quick Review Template created (4 fields)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 2. TASK TEMPLATES (reusable checklists for leads)
  -- ══════════════════════════════════════════════════════════════════════════

  -- Pre-Call Prep
  INSERT INTO task_templates (project_id, name, description, items) VALUES
  (pid, 'Pre-Call Prep', 'Research checklist before first cold call', '[
    {"id": "1", "label": "Check their website — does it convert?", "type": "checkbox"},
    {"id": "2", "label": "Find the decision maker (owner/manager)", "type": "checkbox"},
    {"id": "3", "label": "Note 1 specific thing about their business", "type": "checkbox"},
    {"id": "4", "label": "Prepare mockup or audit screenshot", "type": "checkbox"},
    {"id": "5", "label": "Set call objective: walkthrough or close?", "type": "checkbox"}
  ]'::jsonb);

  -- Post-Meeting Follow-Up
  INSERT INTO task_templates (project_id, name, description, items) VALUES
  (pid, 'Post-Meeting Follow-Up', 'After walkthrough call — close the loop', '[
    {"id": "1", "label": "Send recap email within 1 hour", "type": "checkbox"},
    {"id": "2", "label": "Attach mockup/audit PDF", "type": "checkbox"},
    {"id": "3", "label": "Create follow-up task for 48h", "type": "checkbox"},
    {"id": "4", "label": "Update stage to Meeting Booked or Won", "type": "checkbox"},
    {"id": "5", "label": "Log key objections in notes", "type": "checkbox"}
  ]'::jsonb);

  -- Onboarding Checklist (for Won deals)
  INSERT INTO task_templates (project_id, name, description, items) VALUES
  (pid, 'New Client Onboarding', 'Setup checklist after closing $150/mo deal', '[
    {"id": "1", "label": "Collect website login credentials", "type": "checkbox"},
    {"id": "2", "label": "Run full site audit", "type": "checkbox"},
    {"id": "3", "label": "Set up lead capture form", "type": "checkbox"},
    {"id": "4", "label": "Configure 60-second auto-response", "type": "checkbox"},
    {"id": "5", "label": "Send welcome email with timeline", "type": "checkbox"},
    {"id": "6", "label": "Schedule 2-week check-in call", "type": "checkbox"}
  ]'::jsonb);

  RAISE NOTICE '✅ Task Templates created (3 templates)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 3. PLAYBOOK RULES (IF / THEN / BECAUSE)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO rules (project_id, title, if_when, "then", because, confidence, is_active) VALUES
  (
    pid,
    'Free website as door opener',
    'IF calling an education business for the first time',
    'THEN lead with the free website mockup as a case study, NOT as a pitch',
    'BECAUSE the real value is the automation upsell — the free website just gets them talking',
    'Low', true
  ),
  (
    pid,
    'Pivot when they have a website',
    'IF the prospect says they already have a website',
    'THEN pivot to: "How are you currently handling new inquiries when they come in?"',
    'BECAUSE they probably still have slow lead response time — that is the real pain we solve',
    'Low', true
  ),
  (
    pid,
    'Stop pitching too early',
    'IF I catch myself presenting before asking 3+ discovery questions',
    'THEN stop, take a breath, and ask a situation question about their enrollment process',
    'BECAUSE NEPQ only works if the prospect discovers the problem themselves — early pitching kills it',
    'Likely', true
  ),
  (
    pid,
    'Use the 5-minute stat',
    'IF the prospect mentions slow follow-up or manual processes',
    'THEN say: "Studies show if a lead doesnt hear back in 5 minutes, the chance of enrolling drops 80%"',
    'BECAUSE specific stats create urgency and make inaction feel expensive',
    'Low', true
  ),
  (
    pid,
    'Let them do the math',
    'IF the prospect pushes back on $150/mo price',
    'THEN ask: "How much is one enrolled student worth per month? And how many do you think slip through?"',
    'BECAUSE when they calculate $200-500/student x 3 lost = $600-1500 lost, $150 becomes obvious ROI',
    'Likely', true
  ),
  (
    pid,
    'Referral reframe',
    'IF the prospect says "we are mostly referral-based"',
    'THEN reframe: "Referral businesses need fast follow-up even MORE — when someone is referred and doesnt hear back quickly, they check the competitor"',
    'BECAUSE referral-based businesses assume they do not need marketing, but they still lose leads to slow response',
    'Low', true
  ),
  (
    pid,
    'Surface the invisible cost',
    'IF prospect says they handle inquiries "in-house" or "its fine"',
    'THEN ask: "Do you know how many people visit your site each month and never reach out? What if even 10% of them could be captured?"',
    'BECAUSE the biggest cost is invisible — leads they never knew they lost',
    'Low', true
  );

  RAISE NOTICE '✅ Playbook Rules created (7 rules)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 4. SEQUENCES (multi-step outreach cadences)
  -- ══════════════════════════════════════════════════════════════════════════

  -- Cold Outreach Sequence
  INSERT INTO sequences (project_id, name, description, is_active)
  VALUES (pid, 'Cold Outreach — Education', 'Standard 5-touch cold outreach cadence for education businesses', true)
  RETURNING id INTO seq_id;

  INSERT INTO sequence_steps (sequence_id, project_id, position, step_type, delay_days, config) VALUES
  (seq_id, pid, 0, 'call', 0, '{"note": "Cold call using NEPQ opener. If no answer, leave voicemail."}'::jsonb),
  (seq_id, pid, 1, 'email', 1, '{"note": "Case study email — mention the free mockup you built for them."}'::jsonb),
  (seq_id, pid, 2, 'call', 3, '{"note": "Follow-up call. Reference the email: Did you see the mockup I sent?"}'::jsonb),
  (seq_id, pid, 3, 'email', 3, '{"note": "Value email — share a stat about lead response time in education."}'::jsonb),
  (seq_id, pid, 4, 'call', 4, '{"note": "Final attempt. Direct ask: Is this a priority right now or should I check back next quarter?"}'::jsonb);

  -- Re-Engagement Sequence
  INSERT INTO sequences (project_id, name, description, is_active)
  VALUES (pid, 'Re-Engage — Went Dark', 'For prospects who showed interest but stopped responding', true)
  RETURNING id INTO seq_id;

  INSERT INTO sequence_steps (sequence_id, project_id, position, step_type, delay_days, config) VALUES
  (seq_id, pid, 0, 'email', 0, '{"note": "Soft check-in: Hey [Name], I know things get busy. Still open to seeing the mockup?"}'::jsonb),
  (seq_id, pid, 1, 'call', 3, '{"note": "Quick call — reference their original interest and ask if timing is better now."}'::jsonb),
  (seq_id, pid, 2, 'email', 5, '{"note": "Breakup email: I dont want to be a pest. Want me to check back in 3 months?"}'::jsonb);

  RAISE NOTICE '✅ Sequences created (2 sequences, 8 steps)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 5. FRAMEWORK (improvement phases)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO frameworks (project_id, active_phase_key, signals_started_at)
  VALUES (pid, 'opener_reps', now())
  RETURNING id INTO fw_id;

  -- Levers (skills to improve)
  INSERT INTO framework_levers (framework_id, project_id, key, label, prompt, sort_order) VALUES
  (fw_id, pid, 'nepq.connection',  'Connection Questions',  'Disarm, dont pitch. Make them feel heard before anything else.',               0),
  (fw_id, pid, 'nepq.situation',   'Situation Mapping',     'Understand what they have now before showing whats better.',                    1),
  (fw_id, pid, 'nepq.problem',     'Problem Surfacing',     'Ask questions that make THEM realize the problem — dont tell.',                 2),
  (fw_id, pid, 'nepq.consequence', 'Consequence Framing',   'What happens if they do nothing? Make inaction feel expensive.',                3),
  (fw_id, pid, 'nepq.commitment',  'Micro-Commitments',     'Get small yeses before asking for the meeting.',                               4),
  (fw_id, pid, 'call.tonality',    'Tonality & Pace',       'Slow down. Curious tone, not salesy. Pause after questions.',                  5);

  -- Markers (things to track per call)
  INSERT INTO framework_markers (framework_id, project_id, key, label, definition, sort_order) VALUES
  (fw_id, pid, 'nepq_practiced',   'Practiced NEPQ flow',    'Did I follow the NEPQ phases in order instead of pitching early?',               0),
  (fw_id, pid, 'pain_surfaced',    'Surfaced real pain',     'Did the prospect verbalize a problem themselves (not me telling them)?',          1),
  (fw_id, pid, 'new_truth_gained', 'Learned something new',  'Did I learn a fact about their business I didnt know before?',                   2);

  -- Phases (progression stages)
  INSERT INTO framework_phases (
    framework_id, project_id, key, label,
    why_text, do_text, win_text,
    focus_lever_key, action_marker_key, win_marker_key,
    primary_goal, target, period, exit_criteria, sort_order
  ) VALUES
  (
    fw_id, pid, 'opener_reps', 'Opener Reps',
    'I need to get comfortable with the cold open and stop hesitating before dialing',
    'Focus on the connection phase — first 15 seconds. Practice the opener on every single call.',
    'Opener flows naturally, prospects engage instead of hanging up immediately',
    'nepq.connection', 'nepq_practiced', NULL,
    'reps', 50, '{"type":"iso_week"}'::jsonb, '50+ calls/week for 2 weeks and opener feels natural', 0
  ),
  (
    fw_id, pid, 'discovery_quality', 'Discovery Quality',
    'Im getting past the opener but not uncovering real pain — conversations stay surface level',
    'Focus on problem awareness questions. Dont pitch until theyve told you whats wrong.',
    'Prospects are telling me their real problems without me having to push',
    'nepq.problem', 'nepq_practiced', 'pain_surfaced',
    'action', 30, '{"type":"iso_week"}'::jsonb, 'Pain surfaced on 50%+ of conversations for 2 weeks', 1
  ),
  (
    fw_id, pid, 'booking_meetings', 'Book Meetings',
    'Im having good conversations but not converting them into booked meetings',
    'Use consequence + commitment questions. Ask for the meeting explicitly every time.',
    'Booking meetings at a sustainable rate from cold calls',
    'nepq.commitment', 'nepq_practiced', NULL,
    'outcome_meetings', 5, '{"type":"iso_week"}'::jsonb, '5+ meetings/week for 2 consecutive weeks', 2
  );

  RAISE NOTICE '✅ Framework created (6 levers, 3 markers, 3 phases)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 6. KNOWLEDGE BASE CATEGORIES + ENTRIES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO kb_categories (project_id, name, icon, display_mode, sort_order, is_active, show_in_prep) VALUES
  (pid, 'Objection Responses',  '🛡️', 'sections', 0, true, true),
  (pid, 'Segment Intelligence', '🎓', 'bullets',  1, true, true),
  (pid, 'Call Openers',         '📞', 'full_text', 2, true, true),
  (pid, 'Competitor Notes',     '🏢', 'bullets',  3, true, false);

  -- Objection entries
  INSERT INTO kb_entries (project_id, category_id, title, content, sort_order)
  SELECT pid, c.id, e.title, e.content, e.sort_order
  FROM kb_categories c
  CROSS JOIN (VALUES
    ('I need to think about it', E'**Clarify what''s behind it:**\n"That''s not a problem at all. Just so I understand — is it the investment itself, or is it more about whether this is the right time?"\n\n**Then narrow:** "What would need to happen for you to feel comfortable moving forward?"', 0),
    ('We already have someone handling marketing', E'**Separate yourself:**\n"That''s great. What I do is really specific to what happens AFTER someone finds you — how fast they hear back, whether they get followed up with. Is that something your marketing person handles, or is that more internal?"', 1),
    ('$150/month is too much', E'**Let them do the math:**\n"I totally understand. Can I ask — you mentioned losing about X potential students a month from slow follow-up. If even 2-3 of those enrolled, what would that be worth each month?"\n\nMost students = $200-500/mo. 3 lost = $600-1500 lost. $150 is obvious ROI.', 2),
    ('Just send me information', E'**Redirect to walkthrough:**\n"I could do that — the only thing is, what I put together is specific to YOUR business, not a generic brochure. It would make more sense if I walked you through it in 10 minutes. Would that work, or is another time this week better?"', 3)
  ) AS e(title, content, sort_order)
  WHERE c.name = 'Objection Responses' AND c.project_id = pid;

  -- Segment entries
  INSERT INTO kb_entries (project_id, category_id, title, content, segment_filter, sort_order)
  SELECT pid, c.id, e.title, e.content, e.seg, e.sort_order
  FROM kb_categories c
  CROSS JOIN (VALUES
    ('Tutoring Centers', E'- Usually owner-operated, 1-5 staff\n- Revenue: $5K-50K/mo depending on size\n- Pain: inconsistent enrollment, word-of-mouth plateau\n- Decision maker: usually the owner, sometimes a partner\n- Budget cycle: enrollment peaks Aug-Sep and Jan-Feb', NULL, 0),
    ('Language Schools', E'- Often immigrant-founded, community-driven\n- Revenue: varies widely, $3K-30K/mo\n- Pain: competing with apps (Duolingo), need differentiation\n- Decision: owner or academic director\n- Seasonal: summer intensive programs are big revenue', NULL, 1),
    ('Test Prep / SAT / ACT', E'- Highly seasonal (peaks Mar-Jun, Sep-Nov)\n- Premium pricing ($50-200/hr)\n- Pain: parental expectations, competitive market\n- Decision: often parents, not students\n- Key differentiator: results and track record', NULL, 2),
    ('Coding Bootcamps', E'- Tech-forward, already understand marketing\n- Revenue: $5K-20K per student cohort\n- Pain: high CAC, long sales cycle\n- Decision: founder or marketing lead\n- Opportunity: they understand automation value immediately', NULL, 3)
  ) AS e(title, content, seg, sort_order)
  WHERE c.name = 'Segment Intelligence' AND c.project_id = pid;

  RAISE NOTICE '✅ Knowledge Base created (4 categories, 8 entries)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 7. KB TAB CONFIG
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO kb_tab_config (project_id, slug, label, sort_order, is_visible) VALUES
  (pid, 'playbook',  'Playbook',            0, true),
  (pid, 'scripts',   'Scripts',             1, true),
  (pid, 'icp',       'ICP & Segments',      2, true),
  (pid, 'intel',     'Industry Intel',      3, true),
  (pid, 'friction',  'Friction',            4, true),
  (pid, 'metrics',   'Metrics & Dashboard', 5, true)
  ON CONFLICT (project_id, slug) DO NOTHING;

  RAISE NOTICE '✅ KB Tab Config created';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 8. CATEGORIES (segments, root causes, intel categories, etc.)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
  -- Segments
  (pid, 'segment', 'segment', 'Unknown',               'unknown',               '❓', '#6b7280', 0, true),
  (pid, 'segment', 'segment', 'Tutoring — General',    'tutoring-general',      '📚', '#22c55e', 1, true),
  (pid, 'segment', 'segment', 'Tutoring — Languages',  'tutoring-languages',    '🌍', '#3b82f6', 2, true),
  (pid, 'segment', 'segment', 'Tutoring — Test Prep',  'tutoring-test-prep',    '📝', '#f59e0b', 3, true),
  (pid, 'segment', 'segment', 'Coding Bootcamp',       'coding-bootcamp',       '💻', '#8b5cf6', 4, true),
  (pid, 'segment', 'segment', 'Music School',          'music-school',          '🎵', '#f97316', 5, true),
  (pid, 'segment', 'segment', 'Other Education',       'other-education',       '📋', '#64748b', 6, true),

  -- Root Cause Types (for call analysis)
  (pid, 'root_cause_type', 'root_cause_type', 'Script Issue',      'script-issue',     '📝', '#ef4444', 0, true),
  (pid, 'root_cause_type', 'root_cause_type', 'ICP Mismatch',     'icp-mismatch',     '🎯', '#f97316', 1, true),
  (pid, 'root_cause_type', 'root_cause_type', 'Knowledge Gap',    'knowledge-gap',    '📚', '#eab308', 2, true),
  (pid, 'root_cause_type', 'root_cause_type', 'Skill Gap',        'skill-gap',        '🎓', '#14b8a6', 3, true),
  (pid, 'root_cause_type', 'root_cause_type', 'Bad Data',         'bad-data',         '⚠️', '#ec4899', 4, true),
  (pid, 'root_cause_type', 'root_cause_type', 'Timing Issue',     'timing-issue',     '⏰', '#6366f1', 5, true),
  (pid, 'root_cause_type', 'root_cause_type', 'Offer Mismatch',  'offer-mismatch',   '🎁', '#06b6d4', 6, true),

  -- Intel Categories
  (pid, 'intel_category', 'intel_category', 'How Their Business Works',        'how-their-business-works',      '🏭', '#3b82f6', 0, true),
  (pid, 'intel_category', 'intel_category', 'Competitor Landscape',            'competitor-landscape',          '🏢', '#ef4444', 1, true),
  (pid, 'intel_category', 'intel_category', 'Objection Patterns',              'objection-patterns',            '🛡️', '#f59e0b', 2, true),
  (pid, 'intel_category', 'intel_category', 'Pricing & Budget Intelligence',   'pricing-budget-intel',          '💰', '#22c55e', 3, true),
  (pid, 'intel_category', 'intel_category', 'Buying Process & Decision Chain', 'buying-process-decision-chain', '🔗', '#f97316', 4, true),

  -- Script Stages
  (pid, 'script_stage', 'script_stage', 'Cold Open',   'cold-open',   '📞', '#3b82f6', 0, true),
  (pid, 'script_stage', 'script_stage', 'Follow-Up',   'follow-up',   '🔄', '#8b5cf6', 1, true),
  (pid, 'script_stage', 'script_stage', 'Re-Engage',   're-engage',   '🔁', '#22c55e', 2, true),
  (pid, 'script_stage', 'script_stage', 'Close / CTA', 'close-cta',   '🎯', '#f59e0b', 3, true),
  (pid, 'script_stage', 'script_stage', 'Voicemail',   'voicemail',   '📨', '#64748b', 4, true),

  -- Script Section Types (NEPQ phases)
  (pid, 'script_section_type', 'script_section_type', 'Connection',         'connection',         '🤝', '#3b82f6', 0, true),
  (pid, 'script_section_type', 'script_section_type', 'Situation',          'situation',          '📋', '#8b5cf6', 1, true),
  (pid, 'script_section_type', 'script_section_type', 'Problem Awareness',  'problem-awareness',  '🔍', '#06b6d4', 2, true),
  (pid, 'script_section_type', 'script_section_type', 'Solution Awareness', 'solution-awareness', '💡', '#22c55e', 3, true),
  (pid, 'script_section_type', 'script_section_type', 'Consequence',        'consequence',        '⚠️', '#f59e0b', 4, true),
  (pid, 'script_section_type', 'script_section_type', 'Commitment',         'commitment',         '🤝', '#f97316', 5, true),
  (pid, 'script_section_type', 'script_section_type', 'Presentation',       'presentation',       '🎯', '#ef4444', 6, true),

  -- Friction Types
  (pid, 'friction_type', 'friction_type', 'Got Stuck',          'got-stuck',          '🧱', '#ef4444', 0, true),
  (pid, 'friction_type', 'friction_type', 'Wrong Approach',     'wrong-approach',     '🔄', '#f97316', 1, true),
  (pid, 'friction_type', 'friction_type', 'Knowledge Missing',  'knowledge-missing',  '❓', '#eab308', 2, true),
  (pid, 'friction_type', 'friction_type', 'Timing Issue',       'timing-issue',       '⏰', '#6366f1', 3, true),
  (pid, 'friction_type', 'friction_type', 'Offer Didnt Land',   'offer-didnt-land',   '🎁', '#06b6d4', 4, true),

  -- Segment Section Types
  (pid, 'segment_section_type', 'segment_section_type', 'Language Bank', 'language-bank', '💬', '#3b82f6', 0, true),
  (pid, 'segment_section_type', 'segment_section_type', 'Mindset Notes', 'mindset-notes', '🧠', '#8b5cf6', 1, true),
  (pid, 'segment_section_type', 'segment_section_type', 'Market Recap',  'market-recap',  '📰', '#22c55e', 2, true);

  RAISE NOTICE '✅ Categories created (segments, root causes, intel, script stages, friction types)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 9. FIELD TEMPLATES (named groups of custom fields)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO field_templates (project_id, name, description, icon, field_keys) VALUES
  (pid, 'Education Business Profile', 'Key info about the education business', 'school',
   ARRAY['business_type', 'student_count', 'avg_student_value', 'current_website', 'current_marketing']),
  (pid, 'Lead Quality Signals', 'Signals that indicate lead readiness', 'signal',
   ARRAY['inquiry_volume', 'response_time', 'has_automation', 'referral_based', 'enrollment_seasonality']);

  RAISE NOTICE '✅ Field Templates created (2 templates)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- DONE
  -- ══════════════════════════════════════════════════════════════════════════

  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL STARTER DATA SEEDED for project: %', pid;
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  • 1 Quick Review Template (4 fields)';
  RAISE NOTICE '  • 3 Task Templates (Pre-Call, Post-Meeting, Onboarding)';
  RAISE NOTICE '  • 7 Playbook Rules (NEPQ-based)';
  RAISE NOTICE '  • 2 Sequences (Cold Outreach 5-step, Re-Engage 3-step)';
  RAISE NOTICE '  • 1 Framework (3 phases, 6 levers, 3 markers)';
  RAISE NOTICE '  • 4 KB Categories + 8 Entries (objections, segments)';
  RAISE NOTICE '  • KB Tab Config (6 tabs)';
  RAISE NOTICE '  • Categories (segments, root causes, intel, scripts, friction)';
  RAISE NOTICE '  • 2 Field Templates';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';

END $$;
