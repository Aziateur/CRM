-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Fake test data — leads, attempts, script_inbox items
-- Project: 267e1faf-78a8-47ec-9848-2405039127ac
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Create script_inbox table if it doesn't exist ──
CREATE TABLE IF NOT EXISTS public.script_inbox (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
    source_rep_note   TEXT,
    raw_transcript    TEXT NOT NULL,
    target_script_id  UUID REFERENCES kb_scripts(id) ON DELETE SET NULL,
    target_section_id UUID REFERENCES kb_script_sections(id) ON DELETE SET NULL,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'drill_created')),
    synthesized_text  TEXT,
    reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    pillar            TEXT CHECK (pillar IN ('offer', 'operator', 'market', 'messaging')),
    prescription_type TEXT CHECK (prescription_type IN ('kb_entry', 'drill', 'stop_signal', 'script_section')),
    prescription_id   UUID
);

CREATE INDEX IF NOT EXISTS idx_script_inbox_project ON public.script_inbox(project_id);
CREATE INDEX IF NOT EXISTS idx_script_inbox_status  ON public.script_inbox(project_id, status);
CREATE INDEX IF NOT EXISTS idx_script_inbox_created ON public.script_inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_inbox_pillar  ON public.script_inbox(project_id, pillar) WHERE pillar IS NOT NULL;

ALTER TABLE public.script_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "script_inbox_project_access" ON public.script_inbox;
CREATE POLICY "script_inbox_project_access" ON public.script_inbox
    FOR ALL USING (is_member_of(project_id));

-- ── 1. Seed 12 fake leads ──
INSERT INTO public.leads (project_id, company, phone, stage, segment, is_decision_maker, notes, lead_source)
VALUES
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Martinez Trucking LLC',      '(512) 555-0101', 'new',        'Trucking',       'unknown', 'Owner-op, 15 trucks, Austin TX',                     'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Dave''s Hauling Co',          '(713) 555-0102', 'contacted',  'Trucking',       'yes',     'Fleet of 40, wants GPS tracking, spoke to Dave',     'referral'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Greenleaf Landscaping',      '(469) 555-0103', 'new',        'Home Services',  'unknown', 'Residential lawn care, 8 crews',                     'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Precision Plumbing',         '(210) 555-0104', 'contacted',  'Home Services',  'no',      'Spoke to front desk, DM is Mike, call back Tues',   'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Summit Construction',        '(817) 555-0105', 'qualified',  'Construction',   'yes',     'Commercial GC, 12 active sites, pain is scheduling','inbound'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'AllState Roofing',           '(972) 555-0106', 'new',        'Construction',   'unknown', 'Roofing + siding, storm season coming',              'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'QuickFleet Transport',       '(281) 555-0107', 'qualified',  'Trucking',       'yes',     'Intermodal, 85 trucks, VP of Ops interested',        'inbound'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Bright Home Cleaning',       '(512) 555-0108', 'new',        'Home Services',  'unknown', 'Maid service franchise, 30+ crews',                  'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Rocky Mountain Excavation',  '(303) 555-0109', 'contacted',  'Construction',   'yes',     'Heavy equipment, pain is fuel costs',                'referral'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Lone Star HVAC',             '(214) 555-0110', 'new',        'Home Services',  'unknown', 'Commercial HVAC, 20 techs in field',                 'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Pacific Moving Co',          '(415) 555-0111', 'contacted',  'Trucking',       'no',      'Local + long distance moves, dispatcher answered',  'cold_list'),
  ('267e1faf-78a8-47ec-9848-2405039127ac', 'Ace Electrical Services',    '(832) 555-0112', 'qualified',  'Home Services',  'yes',     'Master electrician + owner, 6 vans, needs routing', 'referral');

-- ── 2. Seed 20 fake call attempts across those leads ──
INSERT INTO public.attempts (project_id, lead_id, channel, outcome, what_happened, note, duration_sec, dm_reached, created_at)
SELECT
    '267e1faf-78a8-47ec-9848-2405039127ac',
    l.id,
    'phone',
    a.outcome,
    a.what_happened,
    a.note,
    a.duration_sec,
    a.dm_reached,
    NOW() - (a.days_ago || ' days')::interval
FROM public.leads l
CROSS JOIN (VALUES
  -- Martinez Trucking
  ('Martinez Trucking LLC', 'no_answer',   'Rang 6 times, no VM',          NULL,                                8,   false, 3),
  ('Martinez Trucking LLC', 'voicemail',   'Left standard VM',             'Mentioned GPS tracking savings',    22,  false, 2),
  -- Dave's Hauling
  ('Dave''s Hauling Co',    'connected',   'Connected with Dave, talked 4 min about fleet challenges', 'Dave interested but worried about contract length. Pushing back hard on 2yr commitment. Said "we got burned by the last vendor."', 240, true, 1),
  ('Dave''s Hauling Co',    'callback',    'Dave asked to call back Thursday', 'Needs to check with partner',   45,  true, 0),
  -- Greenleaf
  ('Greenleaf Landscaping', 'no_answer',   'No answer',                    NULL,                                5,   false, 4),
  ('Greenleaf Landscaping', 'gatekeeper',  'Receptionist answered, said owner is in the field', 'Call back after 4pm', 30, false, 2),
  -- Precision Plumbing
  ('Precision Plumbing',    'gatekeeper',  'Front desk, owners are Mike and Lisa', 'Mike does purchasing, Lisa does ops',  35, false, 3),
  ('Precision Plumbing',    'connected',   'Got Mike on the phone, did 3min discovery', 'Pain: techs waste 2hrs/day driving between jobs. Quote: "My guys are burning gas money I dont have."', 180, true, 1),
  -- Summit Construction
  ('Summit Construction',   'connected',   'Great discovery call with CEO', 'Running 12 sites, says scheduling is costing him $50k/mo. Very interested but needs board approval.', 420, true, 2),
  ('Summit Construction',   'connected',   'Follow up, sent proposal',     'Board reviews next week, he said "this is exactly what we need"', 300, true, 0),
  -- AllState Roofing
  ('AllState Roofing',      'no_answer',   'Went to auto-attendant',       NULL,                                10,  false, 5),
  ('AllState Roofing',      'voicemail',   'Left VM about storm season prep', 'Seasonal urgency angle',         18,  false, 3),
  -- QuickFleet
  ('QuickFleet Transport',  'connected',   'VP of Ops meeting, strong interest', 'Pain: driver turnover 40%, wants retention tools. Budget $200k approved.', 600, true, 1),
  -- Bright Home Cleaning
  ('Bright Home Cleaning',  'no_answer',   'No answer, no VM available',   NULL,                                6,   false, 2),
  -- Rocky Mountain
  ('Rocky Mountain Excavation','connected','Spoke with owner Jim, fuel costs are killing margins', 'Jim said "diesel is eating my profit alive, I need route optimization yesterday." Strong buyer.', 350, true, 1),
  -- Lone Star HVAC
  ('Lone Star HVAC',        'gatekeeper',  'Office manager, said owner is Doug', 'Doug available after 2pm',   25, false, 3),
  ('Lone Star HVAC',        'connected',   'Got Doug, 2 min intro', 'Interested but rushed. Said "send me something, Ill look at it." Classic brush-off.', 120, true, 1),
  -- Pacific Moving
  ('Pacific Moving Co',     'connected',   'Dispatcher answered, did mini-disco', 'They use paper dispatch still. Quote: "We know we need to modernize but its scary."', 200, true, 2),
  -- Ace Electrical
  ('Ace Electrical Services','connected',  'Owner Tom, great call', 'Pain: routing his 6 vans manually on paper maps. Loved the demo. Wants pricing for 10 users.', 480, true, 0),
  ('Ace Electrical Services','connected',  'Follow up pricing call', 'Tom approved $150/mo. Closing paperwork next week.', 300, true, 0)
) AS a(company, outcome, what_happened, note, duration_sec, dm_reached, days_ago)
WHERE l.company = a.company
  AND l.project_id = '267e1faf-78a8-47ec-9848-2405039127ac';

-- ── 3. Seed 6 pending script_inbox items (for Insight Lab testing) ──
INSERT INTO public.script_inbox (project_id, raw_transcript, source_rep_note, status, created_at)
VALUES
  -- Pillar 1 candidate (Offer): pricing objection
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'Prospect said: "Your price is 3x what we pay now. I need to see hard ROI numbers — like actual dollar savings per truck per month — or this conversation is over."',
   'Dave at Hauling Co. He wants a spreadsheet showing fuel savings vs subscription cost.',
   'pending', NOW() - interval '2 hours'),

  -- Pillar 2 candidate (Operator): rep skill gap
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'Rep opened with "Hi, I''m calling from [company], we help businesses like yours..." and prospect immediately said "Not interested" and hung up. Cold opener is failing — too corporate, no disruption pattern.',
   'This is the 4th hang-up in a row with the same opener script. Need a new disruptive pattern interrupt.',
   'pending', NOW() - interval '90 minutes'),

  -- Pillar 3 candidate (Market — Macro): regulation change
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'Multiple trucking prospects mentioned new FMCSA ELD mandate changes coming Q3 2026. They are all panicking about compliance costs. This is hitting the whole industry, not just one company.',
   'Heard this from 3 different fleet owners this week. Major market shift.',
   'pending', NOW() - interval '1 hour'),

  -- Pillar 3 candidate (Market — ICP Psychology): buyer mindset
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'Construction site owners keep saying the same thing: "We''ve been burned by tech vendors before." There''s deep distrust. They want to see it working on someone else''s site first before they commit.',
   'This "show me proof" mindset is consistent across all construction leads.',
   'pending', NOW() - interval '45 minutes'),

  -- Pillar 4 candidate (Messaging): discovery question gap
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'When I ask "What''s your biggest challenge?" the prospect just says "I don''t know, everything is fine." But then 2 minutes later they complain about fuel costs. The question is too broad — need a situation-specific question that unlocks the real pain.',
   'Need better NEPQ-style situation questions for the trucking discovery section.',
   'pending', NOW() - interval '30 minutes'),

  -- Pillar 2 candidate (Operator — Stop Signal): no-connect pattern
  ('267e1faf-78a8-47ec-9848-2405039127ac',
   'Called the same batch of 8 Home Services leads between 9-10am. Got 0 connects — all voicemail or no answer. These owners are in the field in the morning. Need to flag this time window as dead zone.',
   'Morning calls to field-service businesses are a waste. Stop signal needed for this segment+time combo.',
   'pending', NOW() - interval '15 minutes');
