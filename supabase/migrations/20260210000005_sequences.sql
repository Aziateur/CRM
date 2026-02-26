-- Sequences: multi-step outreach cadences
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON sequences FOR ALL USING (true) WITH CHECK (true);

-- Steps within a sequence
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  position INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('call', 'email', 'sms', 'task', 'wait')),
  delay_days INT NOT NULL DEFAULT 0,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sequence_steps_sequence_id ON sequence_steps (sequence_id);

ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON sequence_steps FOR ALL USING (true) WITH CHECK (true);

-- Lead enrollment in a sequence
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_step_completed_at TIMESTAMPTZ,
  next_step_due_at TIMESTAMPTZ,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, sequence_id)
);

CREATE INDEX idx_sequence_enrollments_lead_id ON sequence_enrollments (lead_id);
CREATE INDEX idx_sequence_enrollments_status ON sequence_enrollments (status);
CREATE INDEX idx_sequence_enrollments_next_due ON sequence_enrollments (next_step_due_at);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON sequence_enrollments FOR ALL USING (true) WITH CHECK (true);
