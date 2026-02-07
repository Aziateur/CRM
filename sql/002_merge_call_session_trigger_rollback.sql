-- Rollback: merge_call_session trigger
DROP TRIGGER IF EXISTS trg_merge_call_session ON call_sessions;
DROP FUNCTION IF EXISTS merge_call_session();
DROP INDEX IF EXISTS idx_call_sessions_attempt_id_unique;
DROP INDEX IF EXISTS idx_call_sessions_phone_started;
