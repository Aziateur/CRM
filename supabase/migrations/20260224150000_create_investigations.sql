-- ═══════════════════════════════════════════════════════════════════════════
-- INTELLIGENCE INCUBATOR: Phase 1 — Data Layer
-- Creates the investigation whiteboard and extends the signal inbox.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. The Whiteboard ──
CREATE TABLE IF NOT EXISTS public.investigations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Core fields
    title               TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'crystallized', 'archived')),
    hypothesis          TEXT,
    scratchpad          TEXT,                -- markdown rich-text
    priority            TEXT DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Deployment audit trail
    deployment_receipt  JSONB,              -- [{type:"drill",id:"uuid"},{type:"icp",id:"uuid"}]

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    crystallized_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_investigations_project
    ON public.investigations(project_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status
    ON public.investigations(project_id, status);

ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investigations_project_access" ON public.investigations;
CREATE POLICY "investigations_project_access" ON public.investigations
    FOR ALL USING (is_member_of(project_id));

-- ── 2. Extend script_inbox ──

-- Add FK to investigations (a signal is a sticky note on a whiteboard)
ALTER TABLE public.script_inbox
    ADD COLUMN IF NOT EXISTS investigation_id UUID
    REFERENCES public.investigations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_script_inbox_investigation
    ON public.script_inbox(investigation_id)
    WHERE investigation_id IS NOT NULL;

-- Widen the status enum to support the incubation workflow
-- First, drop the old constraint
ALTER TABLE public.script_inbox DROP CONSTRAINT IF EXISTS script_inbox_status_check;

-- Migrate any legacy statuses BEFORE adding the new constraint
UPDATE public.script_inbox SET status = 'deployed'
    WHERE status IN ('approved', 'drill_created');
UPDATE public.script_inbox SET status = 'discarded'
    WHERE status = 'rejected';

-- Now add the new constraint
ALTER TABLE public.script_inbox ADD CONSTRAINT script_inbox_status_check
    CHECK (status IN ('pending', 'incubating', 'deployed', 'quick_deployed', 'discarded'));
