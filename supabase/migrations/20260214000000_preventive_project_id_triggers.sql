-- Preventive triggers: auto-inherit project_id from lead on INSERT
-- This prevents future NULL project_id records regardless of how they're created.

-- 1. Attempts: inherit project_id from lead
CREATE OR REPLACE FUNCTION set_attempt_project_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id FROM leads WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_attempt_project_id ON attempts;
CREATE TRIGGER trg_set_attempt_project_id
  BEFORE INSERT ON attempts
  FOR EACH ROW EXECUTE FUNCTION set_attempt_project_id();

-- 2. Lead Activities: inherit project_id from lead
CREATE OR REPLACE FUNCTION set_lead_activity_project_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id FROM leads WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_lead_activity_project_id ON lead_activities;
CREATE TRIGGER trg_set_lead_activity_project_id
  BEFORE INSERT ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION set_lead_activity_project_id();

-- 3. Tasks: inherit project_id from lead
CREATE OR REPLACE FUNCTION set_task_project_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id FROM leads WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_task_project_id ON tasks;
CREATE TRIGGER trg_set_task_project_id
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_project_id();
