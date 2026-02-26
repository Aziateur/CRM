-- Templates: reusable call/email scripts with variable placeholders
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'call' CHECK (category IN ('call', 'email', 'sms', 'note')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_category ON templates (category);

-- Enable RLS with anon access (no auth in this project)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON templates FOR ALL USING (true) WITH CHECK (true);

-- Seed 4 default call templates
INSERT INTO templates (name, category, body, variables, is_default, position) VALUES
(
  'Cold Call Opener',
  'call',
  'Hi [name], this is [rep_name] from [company]. I''m reaching out because we help [segment] companies reduce their fleet costs by 15-20%. Do you have 30 seconds?',
  ARRAY['name', 'rep_name', 'company', 'segment'],
  true,
  0
),
(
  'Gatekeeper Script',
  'call',
  'Hi, I''m trying to reach the person who handles your fleet operations — would that be [name]? I have some information about reducing fuel and maintenance costs that they asked me to send over.',
  ARRAY['name'],
  true,
  1
),
(
  'Follow-Up Call',
  'call',
  'Hi [name], it''s [rep_name] again. We spoke [last_contact_date] about [opportunity_angle]. You mentioned [confirmed_fact]. I wanted to follow up on that — has anything changed on your end?',
  ARRAY['name', 'rep_name', 'last_contact_date', 'opportunity_angle', 'confirmed_fact'],
  true,
  2
),
(
  'Meeting Confirmation',
  'email',
  'Hi [name],

Thanks for taking the time to chat today. As discussed, I''d like to set up a meeting to walk through how we can help [company] with [opportunity_angle].

I''ve blocked [meeting_time] on my calendar. Please let me know if that still works for you.

Looking forward to it!

Best,
[rep_name]',
  ARRAY['name', 'company', 'opportunity_angle', 'meeting_time', 'rep_name'],
  true,
  3
);
