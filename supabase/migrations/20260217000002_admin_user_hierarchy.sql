-- ============================================================================
-- Migration: Admin → User Hierarchy
-- ============================================================================
-- Adds proper role hierarchy: system-level (superadmin/admin/user) and
-- project-level (owner/manager/rep). Includes invitation system.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update system_role constraint to include superadmin
-- ---------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_system_role_check;

-- Some installs may have the constraint under a generated name
DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_system_role_check
    CHECK (system_role IN ('superadmin', 'admin', 'user'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Promote existing admin(s) to superadmin (you're the first user)
UPDATE users SET system_role = 'superadmin'
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
  AND system_role = 'admin';

-- ---------------------------------------------------------------------------
-- 2. Migrate project roles: admin→manager, member→rep
-- ---------------------------------------------------------------------------
UPDATE user_projects SET role = 'manager' WHERE role = 'admin';
UPDATE user_projects SET role = 'rep'     WHERE role = 'member';

-- Drop old constraint and add new one
ALTER TABLE user_projects DROP CONSTRAINT IF EXISTS user_projects_role_check;

DO $$
BEGIN
  ALTER TABLE user_projects ADD CONSTRAINT user_projects_role_check
    CHECK (role IN ('owner', 'manager', 'rep'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Project invitations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'rep' CHECK (role IN ('manager', 'rep')),
  invited_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  UNIQUE(project_id, invited_email, status)
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON project_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_project ON project_invitations(project_id);

-- ---------------------------------------------------------------------------
-- 4. RPC: invite_to_project
-- ---------------------------------------------------------------------------
-- If the user already exists, auto-enroll them.
-- If not, create a pending invitation for their email.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION invite_to_project(
  p_project_id UUID,
  p_inviter_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'rep'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing_user RECORD;
  v_already_member BOOLEAN;
  v_invitation_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('manager', 'rep') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be manager or rep.');
  END IF;

  -- Check if inviter has permission (must be owner or manager)
  PERFORM 1 FROM user_projects
    WHERE user_id = p_inviter_id
      AND project_id = p_project_id
      AND role IN ('owner', 'manager');
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You do not have permission to invite users.');
  END IF;

  -- Managers can only invite reps
  IF p_role = 'manager' THEN
    PERFORM 1 FROM user_projects
      WHERE user_id = p_inviter_id
        AND project_id = p_project_id
        AND role = 'owner';
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Only owners can invite managers.');
    END IF;
  END IF;

  -- Check if user already exists
  SELECT id, email, name INTO v_existing_user
    FROM users WHERE email = LOWER(TRIM(p_email));

  IF FOUND THEN
    -- Check if already a member
    SELECT EXISTS(
      SELECT 1 FROM user_projects
        WHERE user_id = v_existing_user.id AND project_id = p_project_id
    ) INTO v_already_member;

    IF v_already_member THEN
      RETURN json_build_object('success', false, 'error', 'User is already a member of this project.');
    END IF;

    -- Auto-enroll existing user
    INSERT INTO user_projects (user_id, project_id, role)
      VALUES (v_existing_user.id, p_project_id, p_role);

    RETURN json_build_object(
      'success', true,
      'action', 'enrolled',
      'user', json_build_object('id', v_existing_user.id, 'email', v_existing_user.email, 'name', v_existing_user.name)
    );
  ELSE
    -- Create pending invitation
    -- Expire any existing pending invitations for this email+project
    UPDATE project_invitations
      SET status = 'expired'
      WHERE invited_email = LOWER(TRIM(p_email))
        AND project_id = p_project_id
        AND status = 'pending';

    INSERT INTO project_invitations (project_id, invited_email, role, invited_by)
      VALUES (p_project_id, LOWER(TRIM(p_email)), p_role, p_inviter_id)
      RETURNING id INTO v_invitation_id;

    RETURN json_build_object(
      'success', true,
      'action', 'invited',
      'invitation_id', v_invitation_id
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: accept_pending_invitations (called on login)
-- ---------------------------------------------------------------------------
-- Auto-enrolls user into any projects they were invited to.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_pending_invitations(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_email TEXT;
  v_inv RECORD;
  v_count INT := 0;
BEGIN
  SELECT email INTO v_user_email FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('accepted', 0);
  END IF;

  FOR v_inv IN
    SELECT id, project_id, role
    FROM project_invitations
    WHERE invited_email = v_user_email
      AND status = 'pending'
      AND expires_at > NOW()
  LOOP
    -- Enroll
    INSERT INTO user_projects (user_id, project_id, role)
      VALUES (p_user_id, v_inv.project_id, v_inv.role)
      ON CONFLICT (user_id, project_id) DO NOTHING;

    -- Mark accepted
    UPDATE project_invitations SET status = 'accepted' WHERE id = v_inv.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('accepted', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: remove_from_project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_from_project(
  p_project_id UUID,
  p_remover_id UUID,
  p_target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_remover_role TEXT;
  v_target_role TEXT;
  v_owner_count INT;
BEGIN
  -- Can't remove yourself
  IF p_remover_id = p_target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot remove yourself.');
  END IF;

  -- Get roles
  SELECT role INTO v_remover_role FROM user_projects
    WHERE user_id = p_remover_id AND project_id = p_project_id;
  SELECT role INTO v_target_role FROM user_projects
    WHERE user_id = p_target_user_id AND project_id = p_project_id;

  IF v_remover_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not a member of this project.');
  END IF;
  IF v_target_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Target user is not a member of this project.');
  END IF;

  -- Permission check: owner can remove anyone, manager can remove reps only
  IF v_remover_role = 'owner' THEN
    -- Can't remove the last owner
    IF v_target_role = 'owner' THEN
      SELECT COUNT(*) INTO v_owner_count FROM user_projects
        WHERE project_id = p_project_id AND role = 'owner';
      IF v_owner_count <= 1 THEN
        RETURN json_build_object('success', false, 'error', 'Cannot remove the last owner.');
      END IF;
    END IF;
  ELSIF v_remover_role = 'manager' THEN
    IF v_target_role != 'rep' THEN
      RETURN json_build_object('success', false, 'error', 'Managers can only remove reps.');
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'You do not have permission to remove users.');
  END IF;

  DELETE FROM user_projects
    WHERE user_id = p_target_user_id AND project_id = p_project_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. RPC: change_project_role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION change_project_role(
  p_project_id UUID,
  p_changer_id UUID,
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_changer_role TEXT;
  v_target_role TEXT;
BEGIN
  IF p_new_role NOT IN ('owner', 'manager', 'rep') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role.');
  END IF;

  IF p_changer_id = p_target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot change your own role.');
  END IF;

  SELECT role INTO v_changer_role FROM user_projects
    WHERE user_id = p_changer_id AND project_id = p_project_id;
  SELECT role INTO v_target_role FROM user_projects
    WHERE user_id = p_target_user_id AND project_id = p_project_id;

  IF v_changer_role IS NULL OR v_target_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found in project.');
  END IF;

  -- Only owners can change roles
  IF v_changer_role != 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only owners can change roles.');
  END IF;

  UPDATE user_projects
    SET role = p_new_role
    WHERE user_id = p_target_user_id AND project_id = p_project_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Update authenticate RPC to return project roles + auto-accept invitations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION authenticate(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_projects JSON;
  v_token UUID;
BEGIN
  SELECT id, email, name, password_hash, system_role, avatar_url
  INTO v_user
  FROM users
  WHERE email = LOWER(TRIM(p_email));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email or password');
  END IF;

  IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email or password');
  END IF;

  -- Auto-accept pending invitations
  PERFORM accept_pending_invitations(v_user.id);

  -- Create new session
  INSERT INTO sessions (user_id) VALUES (v_user.id) RETURNING token INTO v_token;

  -- Fetch user's projects WITH their project role
  SELECT COALESCE(json_agg(json_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'role', up.role,
    'createdAt', p.created_at
  )), '[]'::json)
  INTO v_projects
  FROM user_projects up
  JOIN projects p ON p.id = up.project_id
  WHERE up.user_id = v_user.id;

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'user', json_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'system_role', v_user.system_role,
      'avatar_url', v_user.avatar_url
    ),
    'projects', v_projects
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grant access to invitations table for queries
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON project_invitations TO anon;
GRANT SELECT, INSERT, UPDATE ON project_invitations TO authenticated;
