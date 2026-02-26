-- Phase 1: Micro-Friction Capture
-- friction_categories: user-configurable friction categories
-- friction_logs: individual friction events logged during calls

-- ─── Categories (user-configurable) ───
CREATE TABLE IF NOT EXISTS friction_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    icon        TEXT DEFAULT '⚡',
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);

ALTER TABLE friction_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friction_categories_project_access" ON friction_categories;
CREATE POLICY "friction_categories_project_access" ON friction_categories
    FOR ALL USING (is_member_of(project_id));

-- ─── Friction Logs ───
CREATE TABLE IF NOT EXISTS friction_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id      UUID REFERENCES attempts(id) ON DELETE SET NULL,
    category_id     UUID NOT NULL REFERENCES friction_categories(id) ON DELETE CASCADE,
    note            TEXT,  -- optional, max ~120 chars (enforced client-side)
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE friction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friction_logs_project_access" ON friction_logs;
CREATE POLICY "friction_logs_project_access" ON friction_logs
    FOR ALL USING (is_member_of(project_id));

CREATE INDEX IF NOT EXISTS idx_friction_logs_project ON friction_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_friction_logs_category ON friction_logs(category_id);
CREATE INDEX IF NOT EXISTS idx_friction_logs_created ON friction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friction_logs_attempt ON friction_logs(attempt_id) WHERE attempt_id IS NOT NULL;

-- ─── Seed default categories ───
-- These are inserted per-project on first use (handled client-side),
-- NOT globally, since each project has its own categories.
