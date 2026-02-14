-- ============================================================
-- merge_call_session: deterministic stitch between CRM attempts
-- and OpenPhone calls.
--
-- When a rep dials from /dial-session the CRM creates a
-- call_session row with attempt_id set but openphone_call_id NULL.
-- Later the OpenPhone webhook fires and tries to INSERT a second
-- call_session with openphone_call_id set but attempt_id NULL.
--
-- This BEFORE INSERT trigger merges the two rows so every attempt
-- ends up with exactly one call_session containing both IDs.
-- ============================================================

-- 1. Helper indexes for the trigger queries
CREATE INDEX IF NOT EXISTS idx_cs_phone_started
  ON call_sessions (phone_e164, started_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_attempt_unique
  ON call_sessions (attempt_id)
  WHERE attempt_id IS NOT NULL;

-- 2. Trigger function
CREATE OR REPLACE FUNCTION merge_call_session()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- ─── Case A: duplicate openphone_call_id ───
  -- Idempotency: if we already have a row with this openphone_call_id
  -- just update it with any new data and skip the insert.
  IF NEW.openphone_call_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM call_sessions
     WHERE openphone_call_id = NEW.openphone_call_id
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE call_sessions
         SET recording_url   = COALESCE(NEW.recording_url, recording_url),
             transcript_text = COALESCE(NEW.transcript_text, transcript_text),
             status          = COALESCE(NEW.status, status)
       WHERE id = v_existing_id;
      RETURN NULL;  -- suppress the INSERT
    END IF;
  END IF;

  -- ─── Case B: merge into pending (attempt-backed) row ───
  -- The incoming row has openphone_call_id but no attempt_id.
  -- Look for a pending row that has attempt_id set, same phone,
  -- and started_at within ±5 minutes.
  IF NEW.attempt_id IS NULL AND NEW.openphone_call_id IS NOT NULL AND NEW.phone_e164 IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM call_sessions
     WHERE attempt_id IS NOT NULL
       AND openphone_call_id IS NULL
       AND phone_e164 = NEW.phone_e164
       AND ABS(EXTRACT(EPOCH FROM (started_at - NEW.started_at))) < 300
     ORDER BY ABS(EXTRACT(EPOCH FROM (started_at - NEW.started_at))) ASC
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE call_sessions
         SET openphone_call_id = NEW.openphone_call_id,
             recording_url     = COALESCE(NEW.recording_url, recording_url),
             transcript_text   = COALESCE(NEW.transcript_text, transcript_text),
             status            = COALESCE(NEW.status, status),
             direction         = COALESCE(NEW.direction, direction)
       WHERE id = v_existing_id;
      RETURN NULL;  -- suppress the INSERT, we merged instead
    END IF;
  END IF;

  -- ─── Case C: normal insert ───
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_merge_call_session ON call_sessions;
CREATE TRIGGER trg_merge_call_session
  BEFORE INSERT ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION merge_call_session();
