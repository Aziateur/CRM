-- Migration: Ensure Artifacts View exists and is correct
-- Run this in Supabase SQL Editor if the view is missing

create or replace view v_calls_with_artifacts as
select
  cs.id as call_session_id,
  cs.attempt_id,
  cs.lead_id,
  cs.phone_e164,
  cs.direction,
  cs.status,
  cs.started_at,
  cs.recording_url,
  cs.transcript_text,
  cs.created_at
from call_sessions cs;
