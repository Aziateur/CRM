-- Allow project owners to delete their projects
CREATE POLICY "Owners can delete projects" ON projects
  FOR DELETE USING (owner_id = get_session_user());
