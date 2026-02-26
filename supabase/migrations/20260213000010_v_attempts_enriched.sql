-- v_attempts_enriched: joins attempts with call_sessions so the frontend
-- can display recording audio and transcript without a second query.
CREATE OR REPLACE VIEW v_attempts_enriched AS
SELECT
  a.*,
  cs.recording_url    AS call_recording_url,
  cs.transcript_text  AS call_transcript_text,
  cs.status           AS call_status
FROM attempts a
LEFT JOIN call_sessions cs ON cs.attempt_id = a.id;
