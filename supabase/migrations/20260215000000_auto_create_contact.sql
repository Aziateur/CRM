-- Auto-create a default contact when a lead is inserted with a phone number
-- This ensures every lead has at least one contact row for the dialer.

CREATE OR REPLACE FUNCTION fn_auto_create_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if the lead has a phone and no contacts already exist
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    INSERT INTO contacts (lead_id, name, role, phone)
    VALUES (NEW.id, COALESCE(NEW.company, 'Main'), 'dm', NEW.phone)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_contact ON leads;
CREATE TRIGGER trg_auto_create_contact
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_contact();
