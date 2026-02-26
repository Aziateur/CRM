-- ============================================================================
-- Create "Dev Tool" test user — visible only to superadmin
-- ============================================================================
-- This is a utility account for testing. It is flagged with
-- system_role = 'service' so the app can filter it from normal user lists.
-- Only superadmin sees this user in the System Users tab.
-- 
-- Email:    devtool@dalio-crm.internal
-- Password: Dv!T00l#Crm$2026xQ9
-- ============================================================================

-- Add 'service' as an allowed system_role if a CHECK constraint exists
-- (this is safe to run even if no check constraint)
DO $$ BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_system_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create the dev tool user (idempotent — skip if already exists)
INSERT INTO users (email, name, password_hash, system_role, is_active)
VALUES (
  'devtool@dalio-crm.internal',
  'Dev Tool',
  crypt('Dv!T00l#Crm$2026xQ9', gen_salt('bf')),
  'service',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Create a project for the dev tool user so it can be used for testing
DO $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'devtool@dalio-crm.internal';
  IF v_user_id IS NOT NULL THEN
    -- Check if project already exists
    SELECT id INTO v_project_id FROM projects WHERE owner_id = v_user_id LIMIT 1;
    IF v_project_id IS NULL THEN
      INSERT INTO projects (name, description, owner_id)
      VALUES ('Dev Sandbox', 'Testing & development sandbox', v_user_id)
      RETURNING id INTO v_project_id;

      INSERT INTO user_projects (user_id, project_id, role)
      VALUES (v_user_id, v_project_id, 'owner');
    END IF;
  END IF;
END $$;
