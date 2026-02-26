-- Trigger to log call_sessions (telephony events) to lead_activities
-- This ensures inbound calls and unlogged outbound calls appear in the timeline.

CREATE OR REPLACE FUNCTION log_call_session_activity() RETURNS trigger AS $$
BEGIN
  -- Only log if it's a new call or status changed to completed
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata)
    VALUES (
      NEW.lead_id,
      'call_session', -- Distinct from 'call' which currently represents an Attempt
      'Call ' || NEW.direction || ': ' || NEW.status,
      NEW.transcript_text, -- Include transcript preview if valid
      jsonb_build_object(
        'call_session_id', NEW.id,
        'direction', NEW.direction,
        'status', NEW.status,
        'duration', EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::int,
        'recording_url', NEW.recording_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_call_session_activity ON call_sessions;
CREATE TRIGGER trg_call_session_activity
  AFTER INSERT OR UPDATE OF status ON call_sessions
  FOR EACH ROW EXECUTE FUNCTION log_call_session_activity();
