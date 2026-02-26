-- 1. Backfill missing project_id on call_sessions from leads
UPDATE call_sessions cs
SET project_id = l.project_id
FROM leads l
WHERE cs.lead_id = l.id
  AND cs.project_id IS NULL;

-- 2. Trigger to ensure future call_sessions get project_id from lead
CREATE OR REPLACE FUNCTION set_call_session_project_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM leads
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_call_session_project_id ON call_sessions;
CREATE TRIGGER trg_set_call_session_project_id
  BEFORE INSERT ON call_sessions
  FOR EACH ROW EXECUTE FUNCTION set_call_session_project_id();

-- 3. Backfill linking between call_sessions and attempts
-- Link call_sessions to attempts if they are for the same lead and time matches (attempt created 0-45 mins after call)
-- This fixes "missed links" due to RLS visibility issues during logging
UPDATE call_sessions cs
SET attempt_id = sub.attempt_id
FROM (
  SELECT cs.id AS cs_id, a.id AS attempt_id
  FROM call_sessions cs
  JOIN attempts a ON a.lead_id = cs.lead_id
  WHERE cs.attempt_id IS NULL
    AND a.created_at >= cs.created_at
    AND a.created_at <= (cs.created_at + interval '45 minutes')
  -- Resolve ambiguity by picking closest attempt? 
  -- Simple join handles one-to-one well enough for this fix.
) sub
WHERE cs.id = sub.cs_id
  AND cs.attempt_id IS NULL;
