-- Task Templates: reusable checklists assignable to leads
-- Items stored as JSONB for full modularity (add/remove/reorder anytime)

CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_project ON task_templates(project_id);

-- Task Assignments: links a template to a lead with filled-in data
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    data JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lead_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_project ON task_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_lead ON task_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_template ON task_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status) WHERE status = 'active';

-- RLS
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_project_access" ON task_templates FOR ALL
    USING (project_id IN (SELECT project_id FROM user_projects WHERE user_id = get_session_user()))
    WITH CHECK (project_id IN (SELECT project_id FROM user_projects WHERE user_id = get_session_user()));

CREATE POLICY "task_assignments_project_access" ON task_assignments FOR ALL
    USING (project_id IN (SELECT project_id FROM user_projects WHERE user_id = get_session_user()))
    WITH CHECK (project_id IN (SELECT project_id FROM user_projects WHERE user_id = get_session_user()));
