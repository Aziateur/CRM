-- Add system_role and avatar_url to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS system_role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Make the first user an admin
UPDATE users 
SET system_role = 'admin' 
WHERE id = (
  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
);

-- Policies for Admin Access?
-- For now, we rely on App Logic, but RLS should strictly enforce specific admin tables if they existed.
-- Current users table is viewable by self.
-- Admins might need to view ALL users.
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    (SELECT system_role FROM users WHERE id = get_session_user()) = 'admin'
  );
