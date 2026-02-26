-- ============================================================================
-- Fix: Activity triggers that fire on DELETE try to INSERT into lead_activities
-- with a lead_id that is being cascade-deleted, violating the FK.
-- Solution: Check that the lead still exists before inserting the activity log.
-- ============================================================================

-- ─── Fix contact delete trigger ───
CREATE OR REPLACE FUNCTION log_contact_activity() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
    VALUES (NEW.lead_id, 'field_change', 'Contact added: ' || NEW.name,
      jsonb_build_object('contact_id', NEW.id, 'action', 'added'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Skip logging if the lead is being cascade-deleted
    IF EXISTS (SELECT 1 FROM leads WHERE id = OLD.lead_id) THEN
      INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
      VALUES (OLD.lead_id, 'field_change', 'Contact removed: ' || OLD.name,
        jsonb_build_object('contact_id', OLD.id, 'action', 'removed'));
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Fix tag delete trigger ───
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
    -- Skip logging if the lead is being cascade-deleted
    IF EXISTS (SELECT 1 FROM leads WHERE id = OLD.lead_id) THEN
      SELECT name INTO v_tag_name FROM tags WHERE id = OLD.tag_id;
      INSERT INTO lead_activities (lead_id, activity_type, title, metadata)
      VALUES (OLD.lead_id, 'tag_change', 'Tag removed: ' || COALESCE(v_tag_name, 'unknown'),
        jsonb_build_object('tag_id', OLD.tag_id, 'action', 'removed'));
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
