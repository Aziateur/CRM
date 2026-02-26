DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drills' AND column_name = 'project_id') THEN
        ALTER TABLE drills ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drills_project_id ON drills(project_id);

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'drills'
        AND policyname = 'Project members can access drills'
    ) THEN
        CREATE POLICY "Project members can access drills" ON drills
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM user_projects
                    WHERE user_projects.project_id = drills.project_id
                    AND user_projects.user_id = auth.uid()
                )
            );
    END IF;
END $$;
