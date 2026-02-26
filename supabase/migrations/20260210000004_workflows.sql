-- Workflows: client-side "when trigger then action" automations
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'stage_change', 'new_lead', 'tag_added', 'tag_removed',
    'field_changed', 'lead_idle', 'task_overdue', 'outcome_logged'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN (
    'change_stage', 'add_tag', 'remove_tag', 'create_task',
    'update_field', 'send_notification', 'enroll_sequence'
  )),
  action_config JSONB NOT NULL DEFAULT '{}',
  execution_count INT DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflows_active ON workflows (is_active) WHERE is_active = true;

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON workflows FOR ALL USING (true) WITH CHECK (true);
