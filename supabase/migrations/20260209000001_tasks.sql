-- Follow-up Tasks: auto-created tasks with dashboard
-- Phase 2 of pipeline-tasks-custom-fields plan

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('call_back', 'follow_up', 'meeting', 'email', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for common queries
-- Pending tasks ordered by due date (dashboard query)
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(due_at) WHERE completed_at IS NULL;
-- Per-lead tasks (drawer query)
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);

-- 3. Enable RLS but allow anon access (no auth)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tasks"
    ON tasks FOR ALL
    USING (true)
    WITH CHECK (true);
