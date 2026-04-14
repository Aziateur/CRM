-- Fix bulk delete: task_assignments RLS was blocking CASCADE deletes
-- The existing policy only allowed access via get_session_user(), which
-- returns NULL for anon key connections. Add a permissive policy to match
-- all other tables in the system.
CREATE POLICY "Allow all for anon" ON task_assignments
  FOR ALL USING (true) WITH CHECK (true);
