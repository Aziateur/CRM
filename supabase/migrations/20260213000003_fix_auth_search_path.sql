-- ============================================================================
-- Fix: Update search_path for Auth Functions to include extensions schema
-- ============================================================================

-- 1. Helper Function to Get Current User from Session Token
CREATE OR REPLACE FUNCTION get_session_user()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_str TEXT;
  v_token UUID;
  v_user_id UUID;
BEGIN
  -- Get token from custom header 'x-session-token'
  v_token_str := current_setting('request.headers', true)::json->>'x-session-token';
  
  IF v_token_str IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_token := v_token_str::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  SELECT user_id INTO v_user_id
  FROM sessions
  WHERE token = v_token AND expires_at > NOW();

  RETURN v_user_id;
END;
$$;

-- 2. Update authenticate()
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
  SELECT id, email, name, password_hash
  INTO v_user
  FROM users
  WHERE email = LOWER(TRIM(p_email));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email or password');
  END IF;

  IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email or password');
  END IF;

  -- Create new session
  INSERT INTO sessions (user_id) VALUES (v_user.id) RETURNING token INTO v_token;

  -- Fetch user's projects
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
      'name', v_user.name
    ),
    'projects', v_projects
  );
END;
$$;

-- 3. Update register_user()
CREATE OR REPLACE FUNCTION register_user(p_email TEXT, p_password TEXT, p_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_token UUID;
BEGIN
  -- Create user
  INSERT INTO users (email, name, password_hash)
  VALUES (LOWER(TRIM(p_email)), TRIM(p_name), crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_user_id;

  -- Auto-create default project
  INSERT INTO projects (name, description, owner_id)
  VALUES (TRIM(p_name) || '''s CRM', 'Default project', v_user_id)
  RETURNING id INTO v_project_id;

  -- Enroll user
  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (v_user_id, v_project_id, 'owner');

  -- Create session
  INSERT INTO sessions (user_id) VALUES (v_user_id) RETURNING token INTO v_token;

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'user', json_build_object('id', v_user_id, 'email', LOWER(TRIM(p_email)), 'name', TRIM(p_name)),
    'project', json_build_object('id', v_project_id, 'name', TRIM(p_name) || '''s CRM')
  );

EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'An account with this email already exists');
END;
$$;
