-- Migration: merge_call_session trigger
-- Purpose: When n8n INSERTs a call_session (with openphone_call_id),
--          merge it into the existing frontend-created row (with attempt_id)
--          instead of creating a duplicate.
-- Rollback: DROP TRIGGER IF EXISTS trg_merge_call_session ON call_sessions;
--           DROP FUNCTION IF EXISTS merge_call_session();

CREATE OR REPLACE FUNCTION merge_call_session()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Step 1: Idempotency check
  -- If a row with this openphone_call_id already exists, UPDATE it and skip INSERT
  IF NEW.openphone_call_id IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM call_sessions
    WHERE openphone_call_id = NEW.openphone_call_id
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE call_sessions SET
        status        = COALESCE(NEW.status, status),
        direction     = COALESCE(NEW.direction, direction),
        duration_seconds = COALESCE(NEW.duration_seconds, duration_seconds),
        started_at    = COALESCE(NEW.started_at, started_at),
        ended_at      = COALESCE(NEW.ended_at, ended_at),
        updated_at    = NOW()
      WHERE id = existing_id;
      RETURN NULL;  -- Skip the INSERT
    END IF;
  END IF;

  -- Step 2: Merge attempt
  -- Match on phone_e164 + closest started_at within 5 minutes
  IF NEW.started_at IS NOT NULL AND NEW.phone_e164 IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM call_sessions
    WHERE phone_e164 = NEW.phone_e164
      AND status = 'initiated'
      AND openphone_call_id IS NULL
      AND started_at IS NOT NULL
      AND ABS(EXTRACT(EPOCH FROM (NEW.started_at - started_at))) < 300
    ORDER BY ABS(EXTRACT(EPOCH FROM (NEW.started_at - started_at))) ASC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE call_sessions SET
        openphone_call_id = NEW.openphone_call_id,
        status            = COALESCE(NEW.status, status),
        direction         = COALESCE(NEW.direction, direction),
        duration_seconds  = COALESCE(NEW.duration_seconds, duration_seconds),
        started_at        = COALESCE(NEW.started_at, started_at),
        ended_at          = COALESCE(NEW.ended_at, ended_at),
        updated_at        = NOW()
      WHERE id = existing_id;
      RETURN NULL;  -- Skip the INSERT, we merged instead
    END IF;
  END IF;

  -- Step 3: Fallthrough — normal INSERT
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER trg_merge_call_session
  BEFORE INSERT ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION merge_call_session();

-- Index: Enforce 1:1 attempt-to-call mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_sessions_attempt_id_unique
  ON call_sessions (attempt_id)
  WHERE attempt_id IS NOT NULL;

-- Index: Speed up trigger's phone+time lookup
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone_started
  ON call_sessions (phone_e164, started_at);
