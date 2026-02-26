-- ============================================================
-- script_inbox: Staging buffer for the Sales Knowledge Pipeline
-- Raw insights from Batch Review land here as 'pending'.
-- Managers refine and promote them to live scripts via the Insight Lab.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.script_inbox (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Source traceability
    source_attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
    source_rep_note   TEXT,                          -- rep's own note from call log
    raw_transcript    TEXT NOT NULL,                  -- raw snippet from batch review

    -- Target destination (where this insight wants to go)
    target_script_id  UUID REFERENCES kb_scripts(id) ON DELETE SET NULL,
    target_section_id UUID REFERENCES kb_script_sections(id) ON DELETE SET NULL,

    -- Workflow status
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'drill_created')),

    -- Manager synthesis
    synthesized_text  TEXT,                           -- the refined, clean 1-sentence version

    -- Audit
    reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_script_inbox_project    ON public.script_inbox(project_id);
CREATE INDEX IF NOT EXISTS idx_script_inbox_status     ON public.script_inbox(project_id, status);
CREATE INDEX IF NOT EXISTS idx_script_inbox_created    ON public.script_inbox(created_at DESC);

ALTER TABLE public.script_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "script_inbox_project_access" ON public.script_inbox;
CREATE POLICY "script_inbox_project_access" ON public.script_inbox
    FOR ALL USING (is_member_of(project_id));
