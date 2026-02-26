-- ============================================================
-- Task A.5: Rescue & Route Taxonomy Realignment
-- Moves "Objections" and "Questions" out of Industry/ICP tabs
-- and into the script_inbox for 4-Pillar Diagnosis.
-- ============================================================

-- 1. Rescue from segment_entries (ICP Tab)
INSERT INTO public.script_inbox (
    project_id,
    raw_transcript,
    status,
    pillar,
    created_at,
    updated_at
)
SELECT 
    se.project_id,
    COALESCE(se.title || ': ', '') || se.content AS raw_transcript,
    'pending' AS status,
    'messaging' AS pillar,
    se.created_at,
    NOW() AS updated_at
FROM public.segment_entries se
JOIN public.categories c ON c.id = se.section_type_id
WHERE c.category_type = 'segment_section_type' 
  AND (c.name ILIKE '%objection%' OR c.name ILIKE '%question%' OR c.name ILIKE '%qualify%');

-- 2. Rescue from kb_entries (Industry Tab)
INSERT INTO public.script_inbox (
    project_id,
    raw_transcript,
    status,
    pillar,
    created_at,
    updated_at
)
SELECT 
    ke.project_id,
    COALESCE(ke.title || ': ', '') || ke.content AS raw_transcript,
    'pending' AS status,
    'messaging' AS pillar,
    ke.created_at,
    NOW() AS updated_at
FROM public.kb_entries ke
JOIN public.kb_categories kc ON kc.id = ke.category_id
WHERE kc.name ILIKE '%objection%' OR kc.name ILIKE '%question%' OR kc.name ILIKE '%qualify%';

-- 3. Safely delete legacy categories (cascade will clean up entries)
DELETE FROM public.categories 
WHERE category_type = 'segment_section_type' 
  AND (name ILIKE '%objection%' OR name ILIKE '%question%' OR name ILIKE '%qualify%');

DELETE FROM public.kb_categories 
WHERE (name ILIKE '%objection%' OR name ILIKE '%question%' OR name ILIKE '%qualify%');
