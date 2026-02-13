-- Migration: Universal Project ID Backfill
-- Assigns a default project (the oldest one) to all records that are missing a project_id.
-- This creates a baseline of visibility for RLS policies.

DO $$
DECLARE
  v_default_project_id UUID;
BEGIN
  -- 1. Find a default project (oldest one, likely the 'Default Project')
  SELECT id INTO v_default_project_id FROM projects ORDER BY created_at ASC LIMIT 1;

  IF v_default_project_id IS NOT NULL THEN
    RAISE NOTICE 'Backfilling data using Default Project ID: %', v_default_project_id;

    -- 2. Backfill Leads
    UPDATE leads SET project_id = v_default_project_id WHERE project_id IS NULL;
    
    -- 3. Backfill Contacts
    UPDATE contacts SET project_id = v_default_project_id WHERE project_id IS NULL;

    -- 4. Backfill Call Sessions (and try to inherit from lead first if possible)
    UPDATE call_sessions cs
    SET project_id = l.project_id
    FROM leads l
    WHERE cs.lead_id = l.id
      AND cs.project_id IS NULL;
      
    -- Fallback for orphaned calls
    UPDATE call_sessions SET project_id = v_default_project_id WHERE project_id IS NULL;

    -- 5. Backfill Rules/Stop Signals
    UPDATE rules SET project_id = v_default_project_id WHERE project_id IS NULL;
    UPDATE stop_signals SET project_id = v_default_project_id WHERE project_id IS NULL;
    
    -- 6. Backfill Attempts
    UPDATE attempts SET project_id = v_default_project_id WHERE project_id IS NULL;

    -- 7. Backfill Tasks
    UPDATE tasks SET project_id = v_default_project_id WHERE project_id IS NULL;
    
    RAISE NOTICE 'Backfill complete.';
  ELSE
    RAISE NOTICE 'No projects found. Cannot backfill.';
  END IF;
END $$;
