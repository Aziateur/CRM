-- ============================================================
-- Auto-stitch: when a webhook event arrives, automatically
-- match it to a call_session and copy recording/transcript.
--
-- This replaces the dependency on the API route handler for
-- matching — it works purely at the database level.
--
-- Trigger fires on INSERT to webhook_events for:
--   - call.recording.completed → extract recording_url
--   - call.transcript.completed → extract transcript_text
--   - call.completed → extract openphone_call_id, update status
-- ============================================================

-- Helper function to normalize phone to E.164
CREATE OR REPLACE FUNCTION normalize_phone_e164(phone text) RETURNS text AS $$
BEGIN
  -- Strip everything except + and digits
  phone := regexp_replace(phone, '[^+0-9]', '', 'g');
  -- 10-digit US number → +1XXXXXXXXXX
  IF phone ~ '^\d{10}$' THEN
    RETURN '+1' || phone;
  END IF;
  -- 11-digit starting with 1 → +1XXXXXXXXXX
  IF phone ~ '^1\d{10}$' THEN
    RETURN '+' || phone;
  END IF;
  -- Already has + prefix → return as-is
  IF phone LIKE '+%' THEN
    RETURN phone;
  END IF;
  -- Fallback: add +
  RETURN '+' || phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION auto_stitch_webhook_event() RETURNS TRIGGER AS $$
DECLARE
  v_call_id TEXT;
  v_to_phone TEXT;
  v_from_phone TEXT;
  v_recording_url TEXT;
  v_transcript_text TEXT;
  v_session_id UUID;
  v_event_type TEXT;
  v_status TEXT;
  v_normalized_to TEXT;
  v_normalized_from TEXT;
BEGIN
  v_event_type := NEW.event_type;
  
  -- Only process call events
  IF v_event_type NOT IN ('call.completed', 'call.recording.completed', 'call.transcript.completed') THEN
    RETURN NEW;
  END IF;

  -- Extract the openphone_call_id from the payload
  -- For call.completed and call.recording.completed: payload->body->data->object->id
  -- For call.transcript.completed: payload->body->data->object->callId
  IF v_event_type = 'call.transcript.completed' THEN
    v_call_id := NEW.payload->'body'->'data'->'object'->>'callId';
  ELSE
    v_call_id := NEW.payload->'body'->'data'->'object'->>'id';
  END IF;

  -- Extract phone numbers
  v_to_phone := NEW.payload->'body'->'data'->'object'->>'to';
  v_from_phone := NEW.payload->'body'->'data'->'object'->>'from';

  IF v_call_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ─── Step 1: Try to find by openphone_call_id (exact match) ───
  SELECT id INTO v_session_id
    FROM call_sessions
   WHERE openphone_call_id = v_call_id
   LIMIT 1;

  -- ─── Step 2: If not found, try matching by phone_e164 ───
  IF v_session_id IS NULL AND (v_to_phone IS NOT NULL OR v_from_phone IS NOT NULL) THEN
    -- Normalize phone numbers
    v_normalized_to := CASE WHEN v_to_phone IS NOT NULL THEN normalize_phone_e164(v_to_phone) ELSE NULL END;
    v_normalized_from := CASE WHEN v_from_phone IS NOT NULL THEN normalize_phone_e164(v_from_phone) ELSE NULL END;

    -- Match by phone + recent time window (10 minutes)
    SELECT id INTO v_session_id
      FROM call_sessions
     WHERE openphone_call_id IS NULL
       AND (
         phone_e164 = v_normalized_to
         OR phone_e164 = v_normalized_from
         OR normalize_phone_e164(phone_e164) = v_normalized_to
         OR normalize_phone_e164(phone_e164) = v_normalized_from
       )
       AND created_at > (NOW() - interval '10 minutes')
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  -- If no session found, nothing to update
  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ─── Step 3: Update the call_session based on event type ───
  
  IF v_event_type = 'call.completed' THEN
    v_status := NEW.payload->'body'->'data'->'object'->>'status';
    UPDATE call_sessions
       SET openphone_call_id = v_call_id,
           status = COALESCE(v_status, 'completed')
     WHERE id = v_session_id;

  ELSIF v_event_type = 'call.recording.completed' THEN
    v_recording_url := NEW.payload->'body'->'data'->'object'->'media'->0->>'url';
    UPDATE call_sessions
       SET openphone_call_id = COALESCE(openphone_call_id, v_call_id),
           recording_url = COALESCE(v_recording_url, recording_url),
           status = CASE WHEN status = 'initiated' THEN 'completed' ELSE status END
     WHERE id = v_session_id;

  ELSIF v_event_type = 'call.transcript.completed' THEN
    -- Build transcript from dialogue array
    SELECT string_agg(
      COALESCE(elem->>'identifier', elem->>'userId', 'Unknown') || ': ' || (elem->>'content'),
      E'\n' ORDER BY (elem->>'start')::float
    ) INTO v_transcript_text
    FROM jsonb_array_elements(NEW.payload->'body'->'data'->'object'->'dialogue') AS elem;

    UPDATE call_sessions
       SET openphone_call_id = COALESCE(openphone_call_id, v_call_id),
           transcript_text = COALESCE(v_transcript_text, transcript_text),
           status = CASE WHEN status = 'initiated' THEN 'completed' ELSE status END
     WHERE id = v_session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_stitch_webhook ON webhook_events;
CREATE TRIGGER trg_auto_stitch_webhook
  AFTER INSERT ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_stitch_webhook_event();


-- ============================================================
-- BACKFILL: Fix existing unmatched call_sessions
-- Match recent call_sessions with webhook_events by phone number
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  v_call_id TEXT;
  v_recording_url TEXT;
  v_transcript_text TEXT;
  v_already_exists BOOLEAN;
BEGIN
  -- For each unmatched session, try to find the openphone call by phone
  FOR rec IN
    SELECT cs.id, cs.phone_e164, cs.created_at
      FROM call_sessions cs
     WHERE cs.openphone_call_id IS NULL
       AND cs.created_at > NOW() - interval '7 days'
     ORDER BY cs.created_at DESC
  LOOP
    -- Try to match a call.recording.completed event by phone
    SELECT
      we.payload->'body'->'data'->'object'->>'id' AS call_id,
      we.payload->'body'->'data'->'object'->'media'->0->>'url' AS rec_url
    INTO v_call_id, v_recording_url
    FROM webhook_events we
    WHERE we.event_type = 'call.recording.completed'
      AND (
        we.payload->'body'->'data'->'object'->>'to' = normalize_phone_e164(rec.phone_e164)
        OR we.payload->'body'->'data'->'object'->>'from' = normalize_phone_e164(rec.phone_e164)
      )
      AND we.created_at BETWEEN rec.created_at AND rec.created_at + interval '10 minutes'
    ORDER BY we.created_at ASC
    LIMIT 1;

    IF v_call_id IS NOT NULL THEN
      -- Check if this openphone_call_id already belongs to another session
      SELECT EXISTS(
        SELECT 1 FROM call_sessions WHERE openphone_call_id = v_call_id AND id != rec.id
      ) INTO v_already_exists;

      IF v_already_exists THEN
        RAISE NOTICE 'Skipping session % — call % already assigned', rec.id, v_call_id;
        CONTINUE;
      END IF;

      -- Also get transcript
      SELECT string_agg(
        COALESCE(elem->>'identifier', elem->>'userId', 'Unknown') || ': ' || (elem->>'content'),
        E'\n' ORDER BY (elem->>'start')::float
      ) INTO v_transcript_text
      FROM webhook_events we,
           jsonb_array_elements(we.payload->'body'->'data'->'object'->'dialogue') AS elem
      WHERE we.event_type = 'call.transcript.completed'
        AND we.payload->'body'->'data'->'object'->>'callId' = v_call_id;

      -- Update the session
      UPDATE call_sessions
         SET openphone_call_id = v_call_id,
             recording_url = COALESCE(v_recording_url, recording_url),
             transcript_text = COALESCE(v_transcript_text, transcript_text),
             status = 'completed'
       WHERE id = rec.id;

      RAISE NOTICE 'Backfilled session % with call %', rec.id, v_call_id;
    END IF;
  END LOOP;
END $$;
