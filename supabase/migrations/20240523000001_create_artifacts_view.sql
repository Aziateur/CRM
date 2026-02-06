-- Ensure call_sessions has artifact columns (destination for n8n/webhooks)
alter table call_sessions add column if not exists recording_url text;
alter table call_sessions add column if not exists transcript_text text;

-- Create view to expose artifacts easily
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
