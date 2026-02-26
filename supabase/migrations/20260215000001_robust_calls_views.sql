-- ============================================================
-- Robust v_calls_with_artifacts: dual-source recordings/transcripts
--
-- Recordings and transcripts can arrive via TWO paths:
--   1. Webhook handler writes directly to call_sessions columns
--      (recording_url, transcript_text) — most reliable
--   2. Raw webhook_events JSONB contains media/dialogue payloads
--      (extracted by CTE-based views) — for historical data
--
-- We COALESCE from both sources so the data is available
-- regardless of which path delivered it first.
-- ============================================================

CREATE OR REPLACE VIEW v_calls_with_artifacts AS
WITH recordings AS (
  SELECT
    payload->'body'->'data'->'object'->>'id' AS openphone_call_id,
    payload->'body'->'data'->'object'->'media'->0->>'url' AS recording_url
  FROM webhook_events
  WHERE event_type = 'call.recording.completed'
),
transcripts AS (
  SELECT
    payload->'body'->'data'->'object'->>'callId' AS openphone_call_id,
    string_agg(
      COALESCE(elem->>'identifier', elem->>'userId', 'Unknown') || ': ' || (elem->>'content'),
      E'\n' ORDER BY (elem->>'start')::float
    ) AS transcript_text
  FROM webhook_events,
       jsonb_array_elements(payload->'body'->'data'->'object'->'dialogue') AS elem
  WHERE event_type = 'call.transcript.completed'
  GROUP BY payload->'body'->'data'->'object'->>'callId'
)
SELECT
  cs.id AS call_session_id,
  cs.attempt_id,
  cs.lead_id,
  cs.phone_e164,
  cs.direction,
  cs.status,
  cs.started_at,
  -- COALESCE: prefer call_sessions column (written by webhook handler), fall back to webhook_events extraction
  COALESCE(cs.recording_url, r.recording_url) AS recording_url,
  COALESCE(cs.transcript_text, t.transcript_text) AS transcript_text,
  cs.created_at
FROM call_sessions cs
LEFT JOIN recordings r ON r.openphone_call_id = cs.openphone_call_id
LEFT JOIN transcripts t ON t.openphone_call_id = cs.openphone_call_id;


-- Also update v_attempts_enriched to COALESCE from both sources
CREATE OR REPLACE VIEW v_attempts_enriched AS
WITH recordings AS (
  SELECT
    payload->'body'->'data'->'object'->>'id' AS openphone_call_id,
    payload->'body'->'data'->'object'->'media'->0->>'url' AS recording_url
  FROM webhook_events
  WHERE event_type = 'call.recording.completed'
),
transcripts AS (
  SELECT
    payload->'body'->'data'->'object'->>'callId' AS openphone_call_id,
    string_agg(
      COALESCE(elem->>'identifier', elem->>'userId', 'Unknown') || ': ' || (elem->>'content'),
      E'\n' ORDER BY (elem->>'start')::float
    ) AS transcript_text
  FROM webhook_events,
       jsonb_array_elements(payload->'body'->'data'->'object'->'dialogue') AS elem
  WHERE event_type = 'call.transcript.completed'
  GROUP BY payload->'body'->'data'->'object'->>'callId'
)
SELECT
  a.id,
  a.lead_id,
  a.contact_id,
  a.experiment_id,
  a.channel,
  a.what_happened,
  a.created_at,
  a."timestamp",
  a.outcome,
  a.why,
  a.rep_mistake,
  a.dm_reached,
  a.next_action,
  a.next_action_at,
  a.note,
  a.duration_sec,
  a.experiment_tag,
  a.session_id,
  a.recording_url,
  a.project_id,
  -- COALESCE chain: call_sessions column > webhook_events extraction > attempt column
  COALESCE(cs.recording_url, r.recording_url, a.recording_url) AS call_recording_url,
  COALESCE(cs.transcript_text, t.transcript_text) AS call_transcript_text,
  cs.status AS call_status
FROM attempts a
LEFT JOIN call_sessions cs ON cs.attempt_id = a.id
LEFT JOIN recordings r ON r.openphone_call_id = cs.openphone_call_id
LEFT JOIN transcripts t ON t.openphone_call_id = cs.openphone_call_id;
