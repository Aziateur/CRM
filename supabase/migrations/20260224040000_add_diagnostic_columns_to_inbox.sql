-- ============================================================
-- Diagnostic Data Layer: 4-Pillar routing columns
-- Added to: public.script_inbox
-- These columns record the manager's triage decision:
--   pillar            → root cause category (the diagnosis)
--   prescription_type → which CRM system received the fix
--   prescription_id   → exact record that was created/updated
-- All columns are nullable — existing "pending" rows predate the
-- pillar system and will have NULL, which is correct behaviour.
-- ============================================================

ALTER TABLE public.script_inbox
    ADD COLUMN IF NOT EXISTS pillar TEXT
        CHECK (pillar IN ('offer', 'operator', 'market', 'messaging')),

    ADD COLUMN IF NOT EXISTS prescription_type TEXT
        CHECK (prescription_type IN ('kb_entry', 'drill', 'stop_signal', 'script_section')),

    ADD COLUMN IF NOT EXISTS prescription_id UUID;

-- Index for analytics: "how many items were routed to each pillar this month?"
CREATE INDEX IF NOT EXISTS idx_script_inbox_pillar
    ON public.script_inbox(project_id, pillar)
    WHERE pillar IS NOT NULL;
