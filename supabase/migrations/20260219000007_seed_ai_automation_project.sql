-- ============================================================================
-- PROJECT A: AI Automation & Marketing CRM
-- Target: Tutoring Services
-- Offer: Free Website → AI Automation (lead speed) → Upsells
-- Sales Method: NEPQ by Jeremy Miner
-- Solo operator, 50 calls/day target
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_framework_id UUID;
BEGIN

  SELECT id INTO v_user_id
  FROM users
  WHERE system_role != 'service'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No non-service user found.';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 1. PROJECT
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO projects (name, description, owner_id)
  VALUES (
    'AI Automation & Marketing CRM',
    'NEPQ-based cold calling CRM targeting tutoring services. Free website door-opener → AI automation (lead speed) → upsells (maintenance, ads, email, website upgrades).',
    v_user_id
  )
  RETURNING id INTO v_project_id;

  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (v_user_id, v_project_id, 'owner');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 2. PIPELINE STAGES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO pipeline_stages (project_id, name, position, default_probability, color, is_won, is_lost) VALUES
    (v_project_id, 'New',            0,   0, '#6b7280', false, false),
    (v_project_id, 'Contacted',      1,  10, '#3b82f6', false, false),
    (v_project_id, 'Interested',     2,  30, '#8b5cf6', false, false),
    (v_project_id, 'Meeting Booked', 3,  60, '#f59e0b', false, false),
    (v_project_id, 'Won',            4, 100, '#22c55e', true,  false),
    (v_project_id, 'Lost',           5,   0, '#ef4444', false, true);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 3. KB CATEGORIES
  -- ══════════════════════════════════════════════════════════════════════════

  -- Segments
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
    (v_project_id, 'segment', 'segment', 'Unknown',               'unknown',               '❓', '#6b7280', 0, true),
    (v_project_id, 'segment', 'segment', 'Tutoring — Med School', 'tutoring-med-school',   '🩺', '#ef4444', 1, true),
    (v_project_id, 'segment', 'segment', 'Tutoring — Music',      'tutoring-music',        '🎵', '#8b5cf6', 2, true),
    (v_project_id, 'segment', 'segment', 'Tutoring — Languages',  'tutoring-languages',    '🌍', '#3b82f6', 3, true),
    (v_project_id, 'segment', 'segment', 'Tutoring — Test Prep',  'tutoring-test-prep',    '📝', '#f59e0b', 4, true),
    (v_project_id, 'segment', 'segment', 'Tutoring — General',    'tutoring-general',      '📚', '#22c55e', 5, true),
    (v_project_id, 'segment', 'segment', 'Other',                 'other',                 '📋', '#6b7280', 6, true);

  -- Root Cause Types
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Script Issue',    'script-issue',    '📝', '#ef4444', 'The script didn''t work for this situation', 0, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'ICP Mismatch',   'icp-mismatch',    '🎯', '#f97316', 'Lead didn''t match ideal customer profile', 1, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Knowledge Gap',  'knowledge-gap',   '📚', '#eab308', 'Didn''t know enough about their business or industry', 2, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Skill Gap',      'skill-gap',       '🎓', '#14b8a6', 'Need to practice this NEPQ technique', 3, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Market Condition','market-condition','📈', '#6366f1', 'External factor — timing, season, economy', 4, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Bad Data',       'bad-data',        '⚠️', '#ec4899', 'Wrong number, wrong contact, outdated info', 5, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Process Issue',  'process-issue',   '⚙️', '#64748b', 'Workflow or CRM process needs improvement', 6, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Offer Mismatch', 'offer-mismatch',  '🎁', '#06b6d4', 'The free website / automation pitch didn''t fit their needs', 7, true);

  -- Intel Categories
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'intel_category', 'intel_category', 'How Their Business Works',        'how-their-business-works',      '🏭', '#3b82f6', 'How tutoring businesses get students, deliver sessions, retain clients', 0, true),
    (v_project_id, 'intel_category', 'intel_category', 'Competitor Landscape',            'competitor-landscape',          '🏢', '#ef4444', 'Other marketing agencies, website builders, AI tools they compare to', 1, true),
    (v_project_id, 'intel_category', 'intel_category', 'Market Trends & Conditions',      'market-trends-conditions',      '📊', '#8b5cf6', 'EdTech trends, tutoring market shifts, enrollment patterns', 2, true),
    (v_project_id, 'intel_category', 'intel_category', 'Objection Patterns',              'objection-patterns',            '🛡️', '#f59e0b', 'Common pushbacks and what''s really behind them', 3, true),
    (v_project_id, 'intel_category', 'intel_category', 'Pricing & Deal Intelligence',     'pricing-deal-intelligence',     '💰', '#22c55e', 'What they pay for marketing, websites, tools — budget ranges', 4, true),
    (v_project_id, 'intel_category', 'intel_category', 'Regulations & Compliance',        'regulations-compliance',        '📜', '#06b6d4', 'Education regulations, advertising rules, privacy (FERPA etc.)', 5, true),
    (v_project_id, 'intel_category', 'intel_category', 'Technology & Tools They Use',     'technology-tools-they-use',     '💻', '#14b8a6', 'Current website platform, CRM, scheduling tools, ads', 6, true),
    (v_project_id, 'intel_category', 'intel_category', 'Buying Process & Decision Chain', 'buying-process-decision-chain', '🔗', '#f97316', 'Who decides — owner, partner, franchise HQ — and how they buy', 7, true);

  -- Script Stages
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
    (v_project_id, 'script_stage', 'script_stage', 'Cold Open',   'cold-open',   '📞', '#3b82f6', 0, true),
    (v_project_id, 'script_stage', 'script_stage', 'Follow-Up',   'follow-up',   '🔄', '#8b5cf6', 1, true),
    (v_project_id, 'script_stage', 'script_stage', 'Re-Engage',   're-engage',   '🔁', '#22c55e', 2, true),
    (v_project_id, 'script_stage', 'script_stage', 'Close / CTA', 'close-cta',   '🎯', '#f59e0b', 3, true),
    (v_project_id, 'script_stage', 'script_stage', 'Voicemail',   'voicemail',   '📨', '#64748b', 4, true);

  -- Script Section Types (NEPQ phases)
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'script_section_type', 'script_section_type', 'Connection',         'connection',         '🤝', '#3b82f6', 'NEPQ Phase 1 — Build rapport, disarm resistance, set the tone. NOT a pitch.', 0, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Situation',          'situation',          '📋', '#8b5cf6', 'NEPQ Phase 2 — Understand their current state. What do they have now? How does it work?', 1, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Problem Awareness',  'problem-awareness',  '🔍', '#06b6d4', 'NEPQ Phase 3 — Help them realize the problems they have. Ask questions that surface pain.', 2, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Solution Awareness', 'solution-awareness', '💡', '#22c55e', 'NEPQ Phase 4 — Help them see what a solution could look like. Don''t pitch yet — let them imagine.', 3, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Consequence',        'consequence',        '⚠️', '#f59e0b', 'NEPQ Phase 5 — What happens if they don''t fix this? Make inaction feel costly.', 4, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Commitment',         'commitment',         '🤝', '#f97316', 'NEPQ Phase 6 — Get micro-commitments. Are they open to exploring this?', 5, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Presentation',       'presentation',       '🎯', '#ef4444', 'NEPQ Phase 7 — NOW present the offer. Free website + automation. Only after they''ve sold themselves.', 6, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Voicemail Script',   'voicemail-script',   '📞', '#64748b', 'What to leave on voicemail', 7, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Full Script',        'full-script',        '📄', '#6b7280', 'Complete script (migrated from flat format or all-in-one)', 8, true);

  -- Segment Section Types
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Language Bank', 'language-bank', '💬', '#3b82f6', 'Phrases, sentences, and terminology this segment uses — what they say and what it means', 0, true),
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Mindset Notes', 'mindset-notes', '🧠', '#8b5cf6', 'How they think, what motivates them, what they fear, how they make decisions', 1, true),
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Market Recap',  'market-recap',  '📰', '#22c55e', 'Current state of this market — trends, news, enrollment patterns, seasonal shifts', 2, true);

  -- Friction Types
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
    (v_project_id, 'friction_type', 'friction_type', 'Got Stuck',          'got-stuck',          '🧱', '#ef4444', 0, true),
    (v_project_id, 'friction_type', 'friction_type', 'Wrong Approach',     'wrong-approach',     '🔄', '#f97316', 1, true),
    (v_project_id, 'friction_type', 'friction_type', 'Knowledge Missing',  'knowledge-missing',  '❓', '#eab308', 2, true),
    (v_project_id, 'friction_type', 'friction_type', 'Timing Issue',       'timing-issue',       '⏰', '#6366f1', 3, true),
    (v_project_id, 'friction_type', 'friction_type', 'Offer Didn''t Land', 'offer-didnt-land',   '🎁', '#06b6d4', 4, true);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 4. KB TAB CONFIG
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO kb_tab_config (project_id, slug, label, sort_order, is_visible) VALUES
    (v_project_id, 'playbook',  'Playbook',            0, true),
    (v_project_id, 'scripts',   'Scripts',             1, true),
    (v_project_id, 'icp',       'ICP & Segments',      2, true),
    (v_project_id, 'intel',     'Industry Intel',      3, true),
    (v_project_id, 'friction',  'Friction',            4, true),
    (v_project_id, 'metrics',   'Metrics & Dashboard', 5, true);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 5. FRAMEWORK
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO frameworks (project_id, active_phase_key, signals_started_at)
  VALUES (v_project_id, 'opener_reps', now())
  RETURNING id INTO v_framework_id;

  -- Levers
  INSERT INTO framework_levers (framework_id, project_id, key, label, prompt, sort_order) VALUES
    (v_framework_id, v_project_id, 'nepq.connection',  'Connection Questions',  'Disarm, don''t pitch. Make them feel heard before anything else.',               0),
    (v_framework_id, v_project_id, 'nepq.situation',   'Situation Mapping',     'Understand what they have now before showing what''s better.',                   1),
    (v_framework_id, v_project_id, 'nepq.problem',     'Problem Surfacing',     'Ask questions that make THEM realize the problem — don''t tell.',                2),
    (v_framework_id, v_project_id, 'nepq.consequence', 'Consequence Framing',   'What happens if they do nothing? Make inaction feel expensive.',                 3),
    (v_framework_id, v_project_id, 'nepq.commitment',  'Micro-Commitments',     'Get small yeses before asking for the meeting.',                                4),
    (v_framework_id, v_project_id, 'call.tonality',    'Tonality & Pace',       'Slow down. Curious tone, not salesy. Pause after questions.',                   5);

  -- Markers
  INSERT INTO framework_markers (framework_id, project_id, key, label, definition, sort_order) VALUES
    (v_framework_id, v_project_id, 'nepq_practiced',   'Practiced NEPQ flow',   'Did I follow the NEPQ phases in order instead of pitching early?',               0),
    (v_framework_id, v_project_id, 'pain_surfaced',    'Surfaced real pain',    'Did the prospect verbalize a problem themselves (not me telling them)?',          1),
    (v_framework_id, v_project_id, 'new_truth_gained', 'Learned something new', 'Did I learn a fact about their business I didn''t know before?',                  2);

  -- Phases
  INSERT INTO framework_phases (
    framework_id, project_id, key, label,
    why_text, do_text, win_text,
    focus_lever_key, action_marker_key, win_marker_key,
    primary_goal, target, period, exit_criteria, sort_order
  ) VALUES
    (
      v_framework_id, v_project_id, 'opener_reps', 'Opener Reps',
      'I need to get comfortable with the cold open and stop hesitating before dialing',
      'Focus on the connection phase — first 15 seconds. Practice the opener on every single call.',
      'Opener flows naturally, prospects engage instead of hanging up immediately',
      'nepq.connection', 'nepq_practiced', NULL,
      'reps', 50, '{"type":"iso_week"}'::jsonb, '50+ calls/week for 2 weeks and opener feels natural', 0
    ),
    (
      v_framework_id, v_project_id, 'discovery_quality', 'Discovery Quality',
      'I''m getting past the opener but not uncovering real pain — conversations stay surface level',
      'Focus on problem awareness questions. Don''t pitch until they''ve told you what''s wrong.',
      'Prospects are telling me their real problems without me having to push',
      'nepq.problem', 'nepq_practiced', 'pain_surfaced',
      'action', 30, '{"type":"iso_week"}'::jsonb, 'Pain surfaced on 50%+ of conversations for 2 weeks', 1
    ),
    (
      v_framework_id, v_project_id, 'booking_meetings', 'Book Meetings',
      'I''m having good conversations but not converting them into booked meetings',
      'Use consequence + commitment questions. Ask for the meeting explicitly every time.',
      'Booking meetings at a sustainable rate from cold calls',
      'nepq.commitment', 'nepq_practiced', NULL,
      'outcome_meetings', 5, '{"type":"iso_week"}'::jsonb, '5+ meetings/week for 2 consecutive weeks', 2
    );

  -- ══════════════════════════════════════════════════════════════════════════
  -- 6. PLAYBOOK RULES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO rules (project_id, title, if_when, "then", because, confidence, is_active) VALUES
    (
      v_project_id,
      'Free website as door opener',
      'IF calling a tutoring business owner',
      'THEN lead with the free website offer as a door opener, not as the main pitch',
      'BECAUSE the real value is the automation upsell — the free website just gets them talking',
      'Low', true
    ),
    (
      v_project_id,
      'Pivot to lead speed',
      'IF the prospect already has a website',
      'THEN pivot to ''How are you currently handling new inquiries when they come in?'' (situation → problem awareness)',
      'BECAUSE they still probably have slow lead response time, which is the real pain we solve',
      'Low', true
    ),
    (
      v_project_id,
      'Stop pitching early',
      'IF I catch myself pitching before asking 3+ questions',
      'THEN stop, take a breath, and ask a situation question about their current setup',
      'BECAUSE NEPQ only works if the prospect sells themselves — early pitching creates resistance',
      'Likely', true
    );

  RAISE NOTICE '🎉 AI Automation & Marketing CRM fully configured! Project ID: %', v_project_id;

END $$;
