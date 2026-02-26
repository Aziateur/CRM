-- ============================================================================
-- Migration: Fix users RLS infinite recursion
-- ============================================================================
-- The old "Admins can view all users" policy queried users inside a users
-- policy, causing infinite recursion. This replaces it with a SECURITY DEFINER
-- helper function that bypasses RLS.
-- ============================================================================

-- 1. SECURITY DEFINER helper to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    (SELECT system_role IN ('superadmin', 'admin') FROM users WHERE id = get_session_user()),
    false
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- 3. Non-recursive policies
DROP POLICY IF EXISTS "Users can view themselves" ON users;
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT USING (id = get_session_user());

DROP POLICY IF EXISTS "Admins can view all users v2" ON users;
CREATE POLICY "Admins can view all users v2" ON users
  FOR SELECT USING (is_system_admin());

DROP POLICY IF EXISTS "Users can see project teammates" ON users;
CREATE POLICY "Users can see project teammates" ON users
  FOR SELECT USING (
    id IN (
      SELECT up2.user_id FROM user_projects up2
      WHERE up2.project_id IN (
        SELECT up1.project_id FROM user_projects up1
        WHERE up1.user_id = get_session_user()
      )
    )
  );

-- 4. Admins can update users (for system role changes)
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (is_system_admin());
