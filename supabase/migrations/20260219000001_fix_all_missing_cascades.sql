-- ============================================================================
-- Fix: Add ON DELETE CASCADE to ALL remaining FKs in the delete chain
-- ============================================================================
-- The delete chain is: users → projects → leads → lead_activities, etc.
-- Also: projects → attempts, call_sessions, dial_sessions, etc.
-- Any FK referencing these tables without CASCADE blocks admin deletes.
-- This migration catches EVERYTHING the previous one missed.
-- ============================================================================

-- ─── dial_session_items.lead_id (was missing CASCADE) ───
ALTER TABLE dial_session_items
  DROP CONSTRAINT IF EXISTS dial_session_items_lead_id_fkey;
ALTER TABLE dial_session_items
  ADD CONSTRAINT dial_session_items_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- ─── dial_session_items.attempt_id ───
DO $$ BEGIN
  ALTER TABLE dial_session_items
    DROP CONSTRAINT IF EXISTS dial_session_items_attempt_id_fkey;
  ALTER TABLE dial_session_items
    ADD CONSTRAINT dial_session_items_attempt_id_fkey
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ─── dial_session_items.project_id (re-ensure) ───
ALTER TABLE dial_session_items
  DROP CONSTRAINT IF EXISTS dial_session_items_project_id_fkey;
ALTER TABLE dial_session_items
  ADD CONSTRAINT dial_session_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ─── reviews.call_session_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_call_session_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'call_session_id') THEN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_call_session_id_fkey
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_attempt_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'attempt_id') THEN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_attempt_id_fkey
        FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE reviews
      DROP CONSTRAINT IF EXISTS reviews_project_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'project_id') THEN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── playbook_evidence.call_session_id + attempt_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'playbook_evidence') THEN
    ALTER TABLE playbook_evidence
      DROP CONSTRAINT IF EXISTS playbook_evidence_call_session_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playbook_evidence' AND column_name = 'call_session_id') THEN
      ALTER TABLE playbook_evidence
        ADD CONSTRAINT playbook_evidence_call_session_id_fkey
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    ALTER TABLE playbook_evidence
      DROP CONSTRAINT IF EXISTS playbook_evidence_attempt_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playbook_evidence' AND column_name = 'attempt_id') THEN
      ALTER TABLE playbook_evidence
        ADD CONSTRAINT playbook_evidence_attempt_id_fkey
        FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── review_notes.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_notes') THEN
    ALTER TABLE review_notes
      DROP CONSTRAINT IF EXISTS review_notes_project_id_fkey;
    ALTER TABLE review_notes
      ADD CONSTRAINT review_notes_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── review_templates.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_templates') THEN
    ALTER TABLE review_templates
      DROP CONSTRAINT IF EXISTS review_templates_project_id_fkey;
    ALTER TABLE review_templates
      ADD CONSTRAINT review_templates_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── review_fields.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_fields') THEN
    ALTER TABLE review_fields
      DROP CONSTRAINT IF EXISTS review_fields_project_id_fkey;
    ALTER TABLE review_fields
      ADD CONSTRAINT review_fields_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── experiments.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiments') THEN
    ALTER TABLE experiments
      DROP CONSTRAINT IF EXISTS experiments_project_id_fkey;
    ALTER TABLE experiments
      ADD CONSTRAINT experiments_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── experiment_variants.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiment_variants') THEN
    ALTER TABLE experiment_variants
      DROP CONSTRAINT IF EXISTS experiment_variants_project_id_fkey;
    ALTER TABLE experiment_variants
      ADD CONSTRAINT experiment_variants_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── experiment_conclusions.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'experiment_conclusions') THEN
    ALTER TABLE experiment_conclusions
      DROP CONSTRAINT IF EXISTS experiment_conclusions_project_id_fkey;
    ALTER TABLE experiment_conclusions
      ADD CONSTRAINT experiment_conclusions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── attempt_signals.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attempt_signals') THEN
    ALTER TABLE attempt_signals
      DROP CONSTRAINT IF EXISTS attempt_signals_project_id_fkey;
    ALTER TABLE attempt_signals
      ADD CONSTRAINT attempt_signals_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── frameworks.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'frameworks') THEN
    ALTER TABLE frameworks
      DROP CONSTRAINT IF EXISTS frameworks_project_id_fkey;
    ALTER TABLE frameworks
      ADD CONSTRAINT frameworks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── framework_levers.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_levers') THEN
    ALTER TABLE framework_levers
      DROP CONSTRAINT IF EXISTS framework_levers_project_id_fkey;
    ALTER TABLE framework_levers
      ADD CONSTRAINT framework_levers_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── framework_markers.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_markers') THEN
    ALTER TABLE framework_markers
      DROP CONSTRAINT IF EXISTS framework_markers_project_id_fkey;
    ALTER TABLE framework_markers
      ADD CONSTRAINT framework_markers_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── framework_phases.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_phases') THEN
    ALTER TABLE framework_phases
      DROP CONSTRAINT IF EXISTS framework_phases_project_id_fkey;
    ALTER TABLE framework_phases
      ADD CONSTRAINT framework_phases_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── invitations.invited_by → users ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    ALTER TABLE invitations
      DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitations' AND column_name = 'invited_by') THEN
      ALTER TABLE invitations
        ADD CONSTRAINT invitations_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── lead_activities.lead_id (original CREATE had CASCADE, but re-ensure) ───
ALTER TABLE lead_activities
  DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey;
ALTER TABLE lead_activities
  ADD CONSTRAINT lead_activities_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- ─── lead_activities.project_id ───
ALTER TABLE lead_activities
  DROP CONSTRAINT IF EXISTS lead_activities_project_id_fkey;
ALTER TABLE lead_activities
  ADD CONSTRAINT lead_activities_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ─── contacts.lead_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'lead_id') THEN
    ALTER TABLE contacts
      DROP CONSTRAINT IF EXISTS contacts_lead_id_fkey;
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── attempts.lead_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'lead_id') THEN
    ALTER TABLE attempts
      DROP CONSTRAINT IF EXISTS attempts_lead_id_fkey;
    ALTER TABLE attempts
      ADD CONSTRAINT attempts_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── attempts.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'project_id') THEN
    ALTER TABLE attempts
      DROP CONSTRAINT IF EXISTS attempts_project_id_fkey;
    ALTER TABLE attempts
      ADD CONSTRAINT attempts_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── tasks.lead_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'lead_id') THEN
    ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_lead_id_fkey;
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── tasks.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'project_id') THEN
    ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── call_sessions.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_sessions' AND column_name = 'project_id') THEN
    ALTER TABLE call_sessions
      DROP CONSTRAINT IF EXISTS call_sessions_project_id_fkey;
    ALTER TABLE call_sessions
      ADD CONSTRAINT call_sessions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── dial_sessions.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dial_sessions' AND column_name = 'project_id') THEN
    ALTER TABLE dial_sessions
      DROP CONSTRAINT IF EXISTS dial_sessions_project_id_fkey;
    ALTER TABLE dial_sessions
      ADD CONSTRAINT dial_sessions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── sequences.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequences' AND column_name = 'project_id') THEN
    ALTER TABLE sequences
      DROP CONSTRAINT IF EXISTS sequences_project_id_fkey;
    ALTER TABLE sequences
      ADD CONSTRAINT sequences_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── sequence_enrollments.lead_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_enrollments' AND column_name = 'lead_id') THEN
    ALTER TABLE sequence_enrollments
      DROP CONSTRAINT IF EXISTS sequence_enrollments_lead_id_fkey;
    ALTER TABLE sequence_enrollments
      ADD CONSTRAINT sequence_enrollments_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── view_presets.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'view_presets' AND column_name = 'project_id') THEN
    ALTER TABLE view_presets
      DROP CONSTRAINT IF EXISTS view_presets_project_id_fkey;
    ALTER TABLE view_presets
      ADD CONSTRAINT view_presets_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── tags.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'project_id') THEN
    ALTER TABLE tags
      DROP CONSTRAINT IF EXISTS tags_project_id_fkey;
    ALTER TABLE tags
      ADD CONSTRAINT tags_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── lead_tags.lead_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_tags' AND column_name = 'lead_id') THEN
    ALTER TABLE lead_tags
      DROP CONSTRAINT IF EXISTS lead_tags_lead_id_fkey;
    ALTER TABLE lead_tags
      ADD CONSTRAINT lead_tags_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── templates.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'project_id') THEN
    ALTER TABLE templates
      DROP CONSTRAINT IF EXISTS templates_project_id_fkey;
    ALTER TABLE templates
      ADD CONSTRAINT templates_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── workflows.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'project_id') THEN
    ALTER TABLE workflows
      DROP CONSTRAINT IF EXISTS workflows_project_id_fkey;
    ALTER TABLE workflows
      ADD CONSTRAINT workflows_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── field_definitions.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'field_definitions' AND column_name = 'project_id') THEN
    ALTER TABLE field_definitions
      DROP CONSTRAINT IF EXISTS field_definitions_project_id_fkey;
    ALTER TABLE field_definitions
      ADD CONSTRAINT field_definitions_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── pipeline_stages.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_stages' AND column_name = 'project_id') THEN
    ALTER TABLE pipeline_stages
      DROP CONSTRAINT IF EXISTS pipeline_stages_project_id_fkey;
    ALTER TABLE pipeline_stages
      ADD CONSTRAINT pipeline_stages_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── leads.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'project_id') THEN
    ALTER TABLE leads
      DROP CONSTRAINT IF EXISTS leads_project_id_fkey;
    ALTER TABLE leads
      ADD CONSTRAINT leads_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── categories.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'project_id') THEN
    ALTER TABLE categories
      DROP CONSTRAINT IF EXISTS categories_project_id_fkey;
    ALTER TABLE categories
      ADD CONSTRAINT categories_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── rules.project_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rules' AND column_name = 'project_id') THEN
    ALTER TABLE rules
      DROP CONSTRAINT IF EXISTS rules_project_id_fkey;
    ALTER TABLE rules
      ADD CONSTRAINT rules_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── project_members.project_id + user_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_members') THEN
    ALTER TABLE project_members
      DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
    ALTER TABLE project_members
      ADD CONSTRAINT project_members_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

    ALTER TABLE project_members
      DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
    ALTER TABLE project_members
      ADD CONSTRAINT project_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── sessions.user_id ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    ALTER TABLE sessions
      DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_id') THEN
      ALTER TABLE sessions
        ADD CONSTRAINT sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ─── KB tables ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kb_scripts') THEN
    ALTER TABLE kb_scripts
      DROP CONSTRAINT IF EXISTS kb_scripts_project_id_fkey;
    ALTER TABLE kb_scripts
      ADD CONSTRAINT kb_scripts_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kb_metrics') THEN
    ALTER TABLE kb_metrics
      DROP CONSTRAINT IF EXISTS kb_metrics_project_id_fkey;
    ALTER TABLE kb_metrics
      ADD CONSTRAINT kb_metrics_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'script_sections') THEN
    ALTER TABLE script_sections
      DROP CONSTRAINT IF EXISTS script_sections_project_id_fkey;
    ALTER TABLE script_sections
      ADD CONSTRAINT script_sections_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'segment_entries') THEN
    ALTER TABLE segment_entries
      DROP CONSTRAINT IF EXISTS segment_entries_project_id_fkey;
    ALTER TABLE segment_entries
      ADD CONSTRAINT segment_entries_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── friction logs ───
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friction_categories') THEN
    ALTER TABLE friction_categories
      DROP CONSTRAINT IF EXISTS friction_categories_project_id_fkey;
    ALTER TABLE friction_categories
      ADD CONSTRAINT friction_categories_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friction_logs') THEN
    ALTER TABLE friction_logs
      DROP CONSTRAINT IF EXISTS friction_logs_project_id_fkey;
    ALTER TABLE friction_logs
      ADD CONSTRAINT friction_logs_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;
