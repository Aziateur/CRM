-- ============================================================================
-- PROJECT B: WordPress Repairs CRM
-- Target: Marketing Agencies, Technical Agencies, E-Commerce Owners, General WP Leads
-- Offer: WordPress repairs, security, maintenance (selling for someone else)
-- Sales Method: NEPQ (Neuro-Emotional Persuasion Questions) by Jeremy Miner
-- Solo operator, 50 calls/day target
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_framework_id UUID;
BEGIN

  -- ── Find the primary user (first non-service user) ──
  SELECT id INTO v_user_id
  FROM users
  WHERE system_role != 'service'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No non-service user found. Cannot create project.';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 1. CREATE THE PROJECT
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO projects (name, description, owner_id)
  VALUES (
    'WordPress Repairs CRM',
    'NEPQ-based cold calling CRM for WordPress repair, security & maintenance services. Targeting marketing agencies, technical agencies, e-commerce owners, and general WP leads.',
    v_user_id
  )
  RETURNING id INTO v_project_id;

  -- Enroll user as owner
  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (v_user_id, v_project_id, 'owner');

  RAISE NOTICE '✅ Project created: % (ID: %)', 'WordPress Repairs CRM', v_project_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 2. PIPELINE STAGES (Section 1)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO pipeline_stages (project_id, name, position, default_probability, color, is_won, is_lost) VALUES
    (v_project_id, 'New',            0,   0, '#6b7280', false, false),
    (v_project_id, 'Contacted',      1,  10, '#3b82f6', false, false),
    (v_project_id, 'Interested',     2,  30, '#8b5cf6', false, false),
    (v_project_id, 'Meeting Booked', 3,  60, '#f59e0b', false, false),
    (v_project_id, 'Won',            4, 100, '#22c55e', true,  false),
    (v_project_id, 'Lost',           5,   0, '#ef4444', false, true);

  RAISE NOTICE '✅ Pipeline stages seeded (6)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 3. KB CATEGORIES (Section 4)
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Segments ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'segment', 'segment', 'Unknown',             'unknown',             '❓', '#6b7280', NULL, 0, true),
    (v_project_id, 'segment', 'segment', 'Marketing Agencies',  'marketing-agencies',  '📣', '#3b82f6', 'Agencies managing client WordPress sites — fleet owners with many WP installs', 1, true),
    (v_project_id, 'segment', 'segment', 'Technical Agencies',  'technical-agencies',  '🔧', '#8b5cf6', 'Dev/IT shops that build on WP but don''t want to handle security, updates, repairs', 2, true),
    (v_project_id, 'segment', 'segment', 'E-Commerce Owners',   'e-commerce-owners',   '🛒', '#22c55e', 'WooCommerce and WP-based online stores — downtime = lost revenue', 3, true),
    (v_project_id, 'segment', 'segment', 'General WordPress',   'general-wordpress',   '🌐', '#f59e0b', 'Any business running WordPress — blogs, service sites, portfolios', 4, true),
    (v_project_id, 'segment', 'segment', 'Other',               'other',               '📋', '#6b7280', NULL, 5, true);

  -- ── Root Cause Types ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Script Issue',       'script-issue',       '📝', '#ef4444', 'The script didn''t work for this situation', 0, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'ICP Mismatch',       'icp-mismatch',       '🎯', '#f97316', 'Lead didn''t match ideal customer profile', 1, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Knowledge Gap',      'knowledge-gap',      '📚', '#eab308', 'Didn''t know enough about their WP setup or tech stack', 2, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Skill Gap',          'skill-gap',          '🎓', '#14b8a6', 'Need to practice this NEPQ technique', 3, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Market Condition',   'market-condition',   '📈', '#6366f1', 'External factor — timing, budget cycle, existing contract', 4, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Bad Data',           'bad-data',           '⚠️', '#ec4899', 'Wrong number, wrong contact, site not actually WordPress', 5, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Process Issue',      'process-issue',      '⚙️', '#64748b', 'Workflow or CRM process needs improvement', 6, true),
    (v_project_id, 'root_cause_type', 'root_cause_type', 'Technical Barrier',  'technical-barrier',  '🖥️', '#06b6d4', 'Prospect had a tech question I couldn''t answer about the WP repair service', 7, true);

  -- ── Intel Categories ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'intel_category', 'intel_category', 'How Their Business Works',        'how-their-business-works',        '🏭', '#3b82f6', 'How agencies / e-com owners manage WP — hosting, updates, plugin stack', 0, true),
    (v_project_id, 'intel_category', 'intel_category', 'Competitor Landscape',            'competitor-landscape',            '🏢', '#ef4444', 'Other WP maintenance services, managed hosting, DIY tools they compare to', 1, true),
    (v_project_id, 'intel_category', 'intel_category', 'Market Trends & Conditions',      'market-trends-conditions',        '📊', '#8b5cf6', 'WP security trends, plugin vulnerabilities, hosting market shifts', 2, true),
    (v_project_id, 'intel_category', 'intel_category', 'Objection Patterns',              'objection-patterns',              '🛡️', '#f59e0b', 'Common pushbacks — ''we handle it in-house'', ''too expensive'', ''never had issues''', 3, true),
    (v_project_id, 'intel_category', 'intel_category', 'Pricing & Deal Intelligence',     'pricing-deal-intelligence',       '💰', '#22c55e', 'What they pay for hosting, maintenance, dev hours — budget context', 4, true),
    (v_project_id, 'intel_category', 'intel_category', 'Technology & Tools They Use',     'technology-tools-they-use',       '💻', '#14b8a6', 'Hosting providers, page builders, security plugins, backup tools', 5, true),
    (v_project_id, 'intel_category', 'intel_category', 'Buying Process & Decision Chain', 'buying-process-decision-chain',   '🔗', '#f97316', 'Who decides — agency owner, CTO, ops manager — and how they evaluate', 6, true),
    (v_project_id, 'intel_category', 'intel_category', 'Common WP Problems',             'common-wp-problems',              '🔥', '#ec4899', 'Hacked sites, white screen of death, plugin conflicts, slow loading — problems we fix', 7, true);

  -- ── Script Stages ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
    (v_project_id, 'script_stage', 'script_stage', 'Cold Open',   'cold-open',   '📞', '#3b82f6', 0, true),
    (v_project_id, 'script_stage', 'script_stage', 'Follow-Up',   'follow-up',   '🔄', '#8b5cf6', 1, true),
    (v_project_id, 'script_stage', 'script_stage', 'Re-Engage',   're-engage',   '🔁', '#22c55e', 2, true),
    (v_project_id, 'script_stage', 'script_stage', 'Close / CTA', 'close-cta',   '🎯', '#f59e0b', 3, true),
    (v_project_id, 'script_stage', 'script_stage', 'Voicemail',   'voicemail',   '📨', '#64748b', 4, true);

  -- ── Script Section Types (NEPQ phases) ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'script_section_type', 'script_section_type', 'Connection',         'connection',         '🤝', '#3b82f6', 'NEPQ Phase 1 — Build rapport, disarm resistance, set the tone. NOT a pitch.', 0, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Situation',          'situation',          '📋', '#8b5cf6', 'NEPQ Phase 2 — Understand their current WP setup. Who manages it? How many sites?', 1, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Problem Awareness',  'problem-awareness',  '🔍', '#06b6d4', 'NEPQ Phase 3 — Surface WP pain: security scares, update anxiety, downtime, slow sites', 2, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Solution Awareness', 'solution-awareness', '💡', '#22c55e', 'NEPQ Phase 4 — Help them see what ''handled WP'' looks like. Don''t pitch yet.', 3, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Consequence',        'consequence',        '⚠️', '#f59e0b', 'NEPQ Phase 5 — What happens if the site gets hacked? What does downtime cost them?', 4, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Commitment',         'commitment',         '🤝', '#f97316', 'NEPQ Phase 6 — Get micro-commitments. Are they open to having someone handle this?', 5, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Presentation',       'presentation',       '🎯', '#ef4444', 'NEPQ Phase 7 — NOW present the WP repair / maintenance offer.', 6, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Voicemail Script',   'voicemail-script',   '📞', '#64748b', 'What to leave on voicemail', 7, true),
    (v_project_id, 'script_section_type', 'script_section_type', 'Full Script',        'full-script',        '📄', '#6b7280', 'Complete script (migrated from flat format or all-in-one)', 8, true);

  -- ── Segment Section Types ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, description, sort_order, is_active) VALUES
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Language Bank',  'language-bank',  '💬', '#3b82f6', 'Phrases and terminology this segment uses — how they talk about WP, hosting, maintenance', 0, true),
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Mindset Notes',  'mindset-notes',  '🧠', '#8b5cf6', 'How they think about WP — is it a nuisance, a critical asset, an afterthought?', 1, true),
    (v_project_id, 'segment_section_type', 'segment_section_type', 'Market Recap',   'market-recap',   '📰', '#22c55e', 'Current state of this market — WP trends, security news, hosting changes', 2, true);

  -- ── Friction Types ──
  INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active) VALUES
    (v_project_id, 'friction_type', 'friction_type', 'Got Stuck',           'got-stuck',           '🧱', '#ef4444', 0, true),
    (v_project_id, 'friction_type', 'friction_type', 'Wrong Approach',      'wrong-approach',      '🔄', '#f97316', 1, true),
    (v_project_id, 'friction_type', 'friction_type', 'Knowledge Missing',   'knowledge-missing',   '❓', '#eab308', 2, true),
    (v_project_id, 'friction_type', 'friction_type', 'Timing Issue',        'timing-issue',        '⏰', '#6366f1', 3, true),
    (v_project_id, 'friction_type', 'friction_type', 'Technical Question',  'technical-question',  '🖥️', '#06b6d4', 4, true);

  RAISE NOTICE '✅ KB categories seeded (all 7 types)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 4. KB TAB CONFIG (Section 5)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO kb_tab_config (project_id, slug, label, sort_order, is_visible) VALUES
    (v_project_id, 'playbook',  'Playbook',            0, true),
    (v_project_id, 'scripts',   'Scripts',             1, true),
    (v_project_id, 'icp',       'ICP & Segments',      2, true),
    (v_project_id, 'intel',     'Industry Intel',      3, true),
    (v_project_id, 'friction',  'Friction',            4, true),
    (v_project_id, 'metrics',   'Metrics & Dashboard', 5, true);

  RAISE NOTICE '✅ KB tab config seeded (6 tabs)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 5. FRAMEWORK (Sections 6–9)
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Framework root ──
  INSERT INTO frameworks (project_id, active_phase_key, signals_started_at)
  VALUES (v_project_id, 'opener_reps', now())
  RETURNING id INTO v_framework_id;

  -- ── Levers ──
  INSERT INTO framework_levers (framework_id, project_id, key, label, prompt, sort_order) VALUES
    (v_framework_id, v_project_id, 'nepq.connection',  'Connection Questions',  'Disarm, don''t pitch. Make them feel heard before anything else.',                          0),
    (v_framework_id, v_project_id, 'nepq.situation',   'Situation Mapping',     'Understand their WP setup — how many sites, who manages, what hosting.',                    1),
    (v_framework_id, v_project_id, 'nepq.problem',     'Problem Surfacing',     'Ask questions that surface WP pain — have they ever been hacked? Plugin breaks?',           2),
    (v_framework_id, v_project_id, 'nepq.consequence', 'Consequence Framing',   'What does downtime cost them? What if a client site goes down?',                            3),
    (v_framework_id, v_project_id, 'nepq.commitment',  'Micro-Commitments',     'Get small yeses before asking for the meeting.',                                            4),
    (v_framework_id, v_project_id, 'call.tonality',    'Tonality & Pace',       'Slow down. Curious tone, not salesy. Pause after questions.',                               5),
    (v_framework_id, v_project_id, 'call.technical',   'Technical Credibility', 'Show you understand WP without geeking out. Speak their language.',                         6);

  -- ── Markers ──
  INSERT INTO framework_markers (framework_id, project_id, key, label, definition, sort_order) VALUES
    (v_framework_id, v_project_id, 'nepq_practiced',  'Practiced NEPQ flow',   'Did I follow the NEPQ phases in order instead of pitching early?',                            0),
    (v_framework_id, v_project_id, 'pain_surfaced',   'Surfaced real pain',    'Did the prospect verbalize a WP problem themselves (not me telling them)?',                    1),
    (v_framework_id, v_project_id, 'new_truth_gained','Learned something new', 'Did I learn a fact about their WP setup or business I didn''t know before?',                   2);

  -- ── Phases ──
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
      'I''m getting past the opener but conversations stay surface-level about WordPress',
      'Focus on problem awareness questions. Ask about hacks, downtime, update anxiety. Let them tell you.',
      'Prospects describe their WP pain without me having to push',
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

  RAISE NOTICE '✅ Framework seeded (7 levers, 3 markers, 3 phases, active phase: opener_reps)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 6. PLAYBOOK RULES (Section 14)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO rules (project_id, title, if_when, "then", because, confidence, is_active) VALUES
    (
      v_project_id,
      'Agency fleet check',
      'IF calling a marketing agency about WordPress repairs',
      'THEN ask how many client sites they manage and who handles updates/security',
      'BECAUSE agencies with 10+ client WP sites feel the maintenance pain most — they''re the best fit',
      'Low', true
    ),
    (
      v_project_id,
      'Surface hidden cost',
      'IF the prospect says ''we handle WordPress in-house''',
      'THEN ask ''How much time does your team spend on WP updates and security per week?''',
      'BECAUSE the real cost is hidden in dev hours — surface the time/money sink',
      'Low', true
    ),
    (
      v_project_id,
      'Stop pitching early',
      'IF I catch myself pitching before asking 3+ questions',
      'THEN stop, take a breath, and ask a situation question about their current WP setup',
      'BECAUSE NEPQ only works if the prospect sells themselves — early pitching creates resistance',
      'Likely', true
    );

  RAISE NOTICE '✅ Playbook rules seeded (3 rules)';

  -- ══════════════════════════════════════════════════════════════════════════
  -- DONE
  -- ══════════════════════════════════════════════════════════════════════════

  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 WordPress Repairs CRM fully configured!';
  RAISE NOTICE '   Project ID: %', v_project_id;
  RAISE NOTICE '   User ID:    %', v_user_id;
  RAISE NOTICE '   Framework:  %', v_framework_id;
  RAISE NOTICE '══════════════════════════════════════════════════════════════';

END $$;
