-- ============================================================================
-- RPC: validate_session(token) → JSON
-- ============================================================================
-- Called on page reload to verify the session token is still valid.
-- If valid, extends expiry by 30 days (sliding window) to keep user logged in.
-- Returns the current user data so the frontend can refresh stale localStorage.
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_session(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token UUID;
  v_session RECORD;
  v_user RECORD;
BEGIN
  -- Parse the token
  BEGIN
    v_token := p_token::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid token format');
  END;

  -- Find the session
  SELECT s.token, s.user_id, s.expires_at
  INTO v_session
  FROM sessions s
  WHERE s.token = v_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Session not found');
  END IF;

  -- Check expiry
  IF v_session.expires_at < NOW() THEN
    -- Clean up expired session
    DELETE FROM sessions WHERE token = v_token;
    RETURN json_build_object('valid', false, 'error', 'Session expired');
  END IF;

  -- Session is valid — extend expiry by 30 days (sliding window)
  UPDATE sessions
  SET expires_at = NOW() + interval '30 days'
  WHERE token = v_token;

  -- Fetch fresh user data
  SELECT id, email, name, system_role, avatar_url
  INTO v_user
  FROM users
  WHERE id = v_session.user_id;

  IF NOT FOUND THEN
    -- User was deleted
    DELETE FROM sessions WHERE token = v_token;
    RETURN json_build_object('valid', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'user', json_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'system_role', v_user.system_role,
      'avatar_url', v_user.avatar_url
    )
  );
END;
$$;
