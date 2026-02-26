-- ============================================================================
-- Migration: Users, Projects, and Simple Auth
-- ============================================================================
-- This migration adds multi-tenant project support and simple password auth.
-- Auth uses pgcrypto for password hashing via RPC functions (no Supabase Auth).
-- ============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- USERS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- PROJECTS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- USER ↔ PROJECT MEMBERSHIP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_projects (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- ---------------------------------------------------------------------------
-- ADD project_id TO ALL DATA TABLES
-- ---------------------------------------------------------------------------

-- leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);

-- attempts  
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attempts_project_id ON attempts(project_id);

-- pipeline_stages
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_project_id ON pipeline_stages(project_id);

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- field_definitions (custom fields)
ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_field_definitions_project_id ON field_definitions(project_id);

-- lead_activities
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lead_activities_project_id ON lead_activities(project_id);

-- view_presets
ALTER TABLE view_presets ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_view_presets_project_id ON view_presets(project_id);

-- tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id);

-- templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_templates_project_id ON templates(project_id);

-- workflows
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);

-- sequences
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sequences_project_id ON sequences(project_id);

-- dial_sessions
ALTER TABLE dial_sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_dial_sessions_project_id ON dial_sessions(project_id);

-- ---------------------------------------------------------------------------
-- AUTH RPC: authenticate(email, password) → JSON
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER ensures the function runs with definer's privileges,
-- so the anon key cannot read password_hash directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION authenticate(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_projects JSON;
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
    'user', json_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name
    ),
    'projects', v_projects
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- AUTH RPC: register_user(email, password, name) → JSON
-- Also auto-creates a default project and enrolls the user as owner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_user(p_email TEXT, p_password TEXT, p_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Create user with bcrypt-hashed password
  INSERT INTO users (email, name, password_hash)
  VALUES (LOWER(TRIM(p_email)), TRIM(p_name), crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_user_id;

  -- Auto-create a default project
  INSERT INTO projects (name, description, owner_id)
  VALUES (TRIM(p_name) || '''s CRM', 'Default project', v_user_id)
  RETURNING id INTO v_project_id;

  -- Enroll user as owner
  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (v_user_id, v_project_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'user', json_build_object('id', v_user_id, 'email', LOWER(TRIM(p_email)), 'name', TRIM(p_name)),
    'project', json_build_object('id', v_project_id, 'name', TRIM(p_name) || '''s CRM')
  );

EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'An account with this email already exists');
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create_project(user_id, name, description) → JSON
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_project(p_user_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  INSERT INTO projects (name, description, owner_id)
  VALUES (TRIM(p_name), NULLIF(TRIM(COALESCE(p_description, '')), ''), p_user_id)
  RETURNING id INTO v_project_id;

  INSERT INTO user_projects (user_id, project_id, role)
  VALUES (p_user_id, v_project_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'project', json_build_object('id', v_project_id, 'name', TRIM(p_name))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Restrict direct table access to password_hash
-- ---------------------------------------------------------------------------
-- Revoke direct SELECT on users from anon/authenticated to prevent
-- reading password hashes. The RPC functions (SECURITY DEFINER) handle auth.
-- ---------------------------------------------------------------------------
REVOKE SELECT ON users FROM anon;
REVOKE SELECT ON users FROM authenticated;
