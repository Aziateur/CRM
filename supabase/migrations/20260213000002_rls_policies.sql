-- ============================================================================
-- Migration: RLS Policies & Session Management
-- ============================================================================

-- 1. Create Sessions Table for Custom Auth
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- 2. Helper Function to Get Current User from Session Token
-- ---------------------------------------------------------------------------
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

-- 3. Update authenticate() to Create Session
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

-- 4. Update register_user() to Create Session
-- ---------------------------------------------------------------------------
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

-- 5. Enable RLS on All Tables
-- ---------------------------------------------------------------------------

-- Helper policy function to reuse
-- Checks if the current session user is a member of the given project
CREATE OR REPLACE FUNCTION is_member_of(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_id = get_session_user()
    AND project_id = p_project_id
  );
$$;

-- user_projects: Users can see their own memberships
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memberships" ON user_projects
  FOR SELECT USING (user_id = get_session_user());

-- projects: Users can view projects they are members of
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM user_projects WHERE user_id = get_session_user())
  );
-- Projects can only be created via RPC, but if we allow insert:
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (owner_id = get_session_user());

-- DATA TABLES: Policy is simple: "is_member_of(project_id)"

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access leads" ON leads
  FOR ALL USING (is_member_of(project_id));

-- attempts
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access attempts" ON attempts
  FOR ALL USING (is_member_of(project_id));

-- tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access tasks" ON tasks
  FOR ALL USING (is_member_of(project_id));

-- pipeline_stages
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access stages" ON pipeline_stages
  FOR ALL USING (is_member_of(project_id));

-- tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access tags" ON tags
  FOR ALL USING (is_member_of(project_id));

-- view_presets
ALTER TABLE view_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access view_presets" ON view_presets
  FOR ALL USING (is_member_of(project_id));

-- field_definitions
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access field_definitions" ON field_definitions
  FOR ALL USING (is_member_of(project_id));

-- templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access templates" ON templates
  FOR ALL USING (is_member_of(project_id));

-- workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access workflows" ON workflows
  FOR ALL USING (is_member_of(project_id));

-- sequences
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access sequences" ON sequences
  FOR ALL USING (is_member_of(project_id));

-- dial_sessions
ALTER TABLE dial_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access dial_sessions" ON dial_sessions
  FOR ALL USING (is_member_of(project_id));

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access contacts" ON contacts
  FOR ALL USING (is_member_of(project_id));

-- call_sessions
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access call_sessions" ON call_sessions
  FOR ALL USING (is_member_of(project_id));

-- rules
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access rules" ON rules
  FOR ALL USING (is_member_of(project_id));

-- stop_signals
ALTER TABLE stop_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access stop_signals" ON stop_signals
  FOR ALL USING (is_member_of(project_id));

-- lead_activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access lead_activities" ON lead_activities
  FOR ALL USING (is_member_of(project_id));
