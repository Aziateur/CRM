-- ============================================================================
-- RPC: create_user_for_project
-- ============================================================================
-- Creates a new user with the given credentials and adds them to a project.
-- Only project owners/managers or superadmins can call this.
-- Returns the created user info so the admin can share credentials manually.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_for_project(
  p_creator_id UUID,
  p_project_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_project_role TEXT DEFAULT 'rep',
  p_system_role TEXT DEFAULT 'user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_creator_system_role TEXT;
  v_creator_project_role TEXT;
  v_new_user_id UUID;
  v_existing_user RECORD;
BEGIN
  -- Validate project role
  IF p_project_role NOT IN ('owner', 'manager', 'rep') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid project role. Must be owner, manager, or rep.');
  END IF;

  -- Validate system role
  IF p_system_role NOT IN ('superadmin', 'admin', 'user') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid system role.');
  END IF;

  -- Validate inputs
  IF TRIM(p_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Name is required.');
  END IF;
  IF TRIM(p_email) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email is required.');
  END IF;
  IF LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;

  -- Check creator permissions
  SELECT system_role INTO v_creator_system_role FROM users WHERE id = p_creator_id;
  SELECT role INTO v_creator_project_role FROM user_projects
    WHERE user_id = p_creator_id AND project_id = p_project_id;

  -- Must be superadmin OR project owner/manager
  IF v_creator_system_role NOT IN ('superadmin', 'admin') AND v_creator_project_role NOT IN ('owner', 'manager') THEN
    RETURN json_build_object('success', false, 'error', 'You do not have permission to create users.');
  END IF;

  -- Managers can only create reps
  IF v_creator_project_role = 'manager' AND p_project_role != 'rep' THEN
    RETURN json_build_object('success', false, 'error', 'Managers can only create reps.');
  END IF;

  -- Only superadmins can set system_role to admin/superadmin
  IF p_system_role != 'user' AND v_creator_system_role != 'superadmin' THEN
    RETURN json_build_object('success', false, 'error', 'Only superadmins can assign admin system roles.');
  END IF;

  -- Check if email already exists
  SELECT id, email, name INTO v_existing_user FROM users WHERE email = LOWER(TRIM(p_email));
  IF FOUND THEN
    -- If already exists, just add to project if not already a member
    IF EXISTS (SELECT 1 FROM user_projects WHERE user_id = v_existing_user.id AND project_id = p_project_id) THEN
      RETURN json_build_object('success', false, 'error', 'A user with this email already exists and is already a member of this project.');
    END IF;

    INSERT INTO user_projects (user_id, project_id, role)
      VALUES (v_existing_user.id, p_project_id, p_project_role);

    RETURN json_build_object(
      'success', true,
      'action', 'enrolled_existing',
      'user', json_build_object(
        'id', v_existing_user.id,
        'email', v_existing_user.email,
        'name', v_existing_user.name
      )
    );
  END IF;

  -- Create the user
  INSERT INTO users (email, name, password_hash, system_role, is_active)
  VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_name),
    crypt(p_password, gen_salt('bf')),
    p_system_role,
    true
  )
  RETURNING id INTO v_new_user_id;

  -- Add to project
  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (v_new_user_id, p_project_id, p_project_role);

  RETURN json_build_object(
    'success', true,
    'action', 'created',
    'user', json_build_object(
      'id', v_new_user_id,
      'email', LOWER(TRIM(p_email)),
      'name', TRIM(p_name),
      'system_role', p_system_role,
      'project_role', p_project_role
    )
  );

EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'A user with this email already exists.');
END;
$$;
