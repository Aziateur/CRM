-- Rollback: remove merge_call_session trigger, function, and indexes

DROP TRIGGER IF EXISTS trg_merge_call_session ON call_sessions;
DROP FUNCTION IF EXISTS merge_call_session();
DROP INDEX IF EXISTS idx_cs_phone_started;
DROP INDEX IF EXISTS idx_cs_attempt_unique;
