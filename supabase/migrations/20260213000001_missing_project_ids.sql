-- Migration: Add missing project_id to remaining tables
-- Tables: contacts, call_sessions, rules, stop_signals

-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contacts_project_id ON contacts(project_id);

-- call_sessions
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_call_sessions_project_id ON call_sessions(project_id);

-- rules (playbook)
ALTER TABLE rules ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rules_project_id ON rules(project_id);

-- stop_signals (playbook)
ALTER TABLE stop_signals ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stop_signals_project_id ON stop_signals(project_id);
