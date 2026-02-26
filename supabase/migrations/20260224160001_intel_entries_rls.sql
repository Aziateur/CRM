-- =====================================================
-- Intel Entries: RLS + Security
-- =====================================================

ALTER TABLE public.intel_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intel_entries_project_access" ON public.intel_entries;
CREATE POLICY "intel_entries_project_access" ON public.intel_entries
    FOR ALL USING (is_member_of(project_id));
