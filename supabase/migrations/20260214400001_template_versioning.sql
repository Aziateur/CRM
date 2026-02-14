-- Phase 2: Template Versioning + Governance
-- Templates become locked once used in a review (immutable fields)
-- Editing a locked template creates a new version

ALTER TABLE review_templates
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Auto-lock a template version when it's first used in a review
CREATE OR REPLACE FUNCTION lock_template_on_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE review_templates
       SET is_locked = true
     WHERE id = NEW.template_id
       AND is_locked = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_template_on_review
  AFTER INSERT ON call_reviews
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION lock_template_on_review();
