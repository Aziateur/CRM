-- ============================================================================
-- Fix: Add ON DELETE CASCADE to ALL tables referencing projects(id)
-- ============================================================================
-- Several tables were created with REFERENCES projects(id) but without
-- ON DELETE CASCADE. This blocks admin operations like deleting users
-- (which cascades to their owned projects).
-- ============================================================================

-- ─── dial_session_items ───
ALTER TABLE dial_session_items
  DROP CONSTRAINT IF EXISTS dial_session_items_project_id_fkey;
ALTER TABLE dial_session_items
  ADD CONSTRAINT dial_session_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Also fix lead_id FK
ALTER TABLE dial_session_items
  DROP CONSTRAINT IF EXISTS dial_session_items_lead_id_fkey;
ALTER TABLE dial_session_items
  ADD CONSTRAINT dial_session_items_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- ─── Review system tables ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'playbook_evidence') THEN
    ALTER TABLE playbook_evidence
      DROP CONSTRAINT IF EXISTS playbook_evidence_project_id_fkey;
    ALTER TABLE playbook_evidence
      ADD CONSTRAINT playbook_evidence_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_notes') THEN
    ALTER TABLE review_notes
      DROP CONSTRAINT IF EXISTS review_notes_project_id_fkey;
    ALTER TABLE review_notes
      ADD CONSTRAINT review_notes_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Templates (review_templates, review_fields) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_templates') THEN
    ALTER TABLE review_templates
      DROP CONSTRAINT IF EXISTS review_templates_project_id_fkey;
    ALTER TABLE review_templates
      ADD CONSTRAINT review_templates_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_fields') THEN
    ALTER TABLE review_fields
      DROP CONSTRAINT IF EXISTS review_fields_project_id_fkey;
    ALTER TABLE review_fields
      ADD CONSTRAINT review_fields_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Framework tables ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'frameworks') THEN
    ALTER TABLE frameworks
      DROP CONSTRAINT IF EXISTS frameworks_project_id_fkey;
    ALTER TABLE frameworks
      ADD CONSTRAINT frameworks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_levers') THEN
    ALTER TABLE framework_levers
      DROP CONSTRAINT IF EXISTS framework_levers_project_id_fkey;
    ALTER TABLE framework_levers
      ADD CONSTRAINT framework_levers_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_markers') THEN
    ALTER TABLE framework_markers
      DROP CONSTRAINT IF EXISTS framework_markers_project_id_fkey;
    ALTER TABLE framework_markers
      ADD CONSTRAINT framework_markers_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_phases') THEN
    ALTER TABLE framework_phases
      DROP CONSTRAINT IF EXISTS framework_phases_project_id_fkey;
    ALTER TABLE framework_phases
      ADD CONSTRAINT framework_phases_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Attempt signals ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attempt_signals') THEN
    ALTER TABLE attempt_signals
      DROP CONSTRAINT IF EXISTS attempt_signals_project_id_fkey;
    ALTER TABLE attempt_signals
      ADD CONSTRAINT attempt_signals_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Experiments ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiments') THEN
    ALTER TABLE experiments
      DROP CONSTRAINT IF EXISTS experiments_project_id_fkey;
    ALTER TABLE experiments
      ADD CONSTRAINT experiments_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiment_variants') THEN
    ALTER TABLE experiment_variants
      DROP CONSTRAINT IF EXISTS experiment_variants_project_id_fkey;
    ALTER TABLE experiment_variants
      ADD CONSTRAINT experiment_variants_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiment_conclusions') THEN
    ALTER TABLE experiment_conclusions
      DROP CONSTRAINT IF EXISTS experiment_conclusions_project_id_fkey;
    ALTER TABLE experiment_conclusions
      ADD CONSTRAINT experiment_conclusions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;
