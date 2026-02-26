-- Activity Triggers: automatically log to lead_activities on all mutations
-- This makes the activity feed truthful regardless of which UI/webhook/automation triggers the mutation.

-- ============================================================================
-- 1. Trigger: Log attempt to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_attempt_activity() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata)
  VALUES (
    NEW.lead_id,
    'call',
    'Attempt: ' || NEW.outcome,
    NEW.note,
    jsonb_build_object(
      'attempt_id', NEW.id,
      'outcome', NEW.outcome,
      'why', NEW.why,
      'next_action', NEW.next_action,
      'dm_reached', NEW.dm_reached
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attempt_activity ON attempts;
CREATE TRIGGER trg_attempt_activity
  AFTER INSERT ON attempts
  FOR EACH ROW EXECUTE FUNCTION log_attempt_activity();

-- ============================================================================
-- 2. Trigger: Log stage change to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_stage_change_activity() RETURNS trigger AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, description, metadata)
    VALUES (
      NEW.id,
      'stage_change',
      'Stage: ' || COALESCE(OLD.stage, 'New') || ' → ' || COALESCE(NEW.stage, 'New'),
      NULL,
      jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stage_change_activity ON leads;
CREATE TRIGGER trg_stage_change_activity
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW EXECUTE FUNCTION log_stage_change_activity();

-- ============================================================================
-- 3. Trigger: Log contact add/delete to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_contact_activity() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'field_change', 'Contact added: ' || NEW.name,
      jsonb_build_object('contact_id', NEW.id, 'action', 'added'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (OLD.lead_id, 'field_change', 'Contact removed: ' || OLD.name,
      jsonb_build_object('contact_id', OLD.id, 'action', 'removed'));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contact_activity ON contacts;
CREATE TRIGGER trg_contact_activity
  AFTER INSERT OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_contact_activity();

-- ============================================================================
-- 4. Trigger: Log task completion to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_task_completed_activity() RETURNS trigger AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'task_completed', 'Task completed: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'type', NEW.type));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_completed_activity ON tasks;
CREATE TRIGGER trg_task_completed_activity
  AFTER UPDATE OF completed_at ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_completed_activity();

-- ============================================================================
-- 5. Trigger: Log task creation to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_task_created_activity() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
  VALUES (NEW.lead_id, 'task_created', 'Task created: ' || NEW.title,
    jsonb_build_object('task_id', NEW.id, 'type', NEW.type, 'due_at', NEW.due_at));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_created_activity ON tasks;
CREATE TRIGGER trg_task_created_activity
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_created_activity();

-- ============================================================================
-- 6. Trigger: Log tag add/remove to lead_activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_tag_activity() RETURNS trigger AS $$
DECLARE
  v_tag_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_tag_name FROM tags WHERE id = NEW.tag_id;
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'tag_change', 'Tag added: ' || COALESCE(v_tag_name, 'unknown'),
      jsonb_build_object('tag_id', NEW.tag_id, 'action', 'added'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_tag_name FROM tags WHERE id = OLD.tag_id;
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (OLD.lead_id, 'tag_change', 'Tag removed: ' || COALESCE(v_tag_name, 'unknown'),
      jsonb_build_object('tag_id', OLD.tag_id, 'action', 'removed'));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tag_activity ON lead_tags;
CREATE TRIGGER trg_tag_activity
  AFTER INSERT OR DELETE ON lead_tags
  FOR EACH ROW EXECUTE FUNCTION log_tag_activity();
