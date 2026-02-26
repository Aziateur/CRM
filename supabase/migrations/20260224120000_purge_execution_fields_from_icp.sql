-- ═══════════════════════════════════════════════════════════════════════
-- TAXONOMY PURGE: Remove execution data that was misplaced in ICP fields
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Delete forbidden ICP fields from icp_fields table ──
-- These are execution-layer data (Qualifying Questions, Common Objections)
-- and psychology-layer data (Common Pain Points) that were wrongly seeds
-- as firmographic fields. Deleting the field also orphans any icp_values 
-- rows referencing them, so clean those up too.

DELETE FROM public.icp_values
WHERE field_id IN (
    SELECT id FROM public.icp_fields
    WHERE field_name IN ('Qualifying Questions', 'Common Objections', 'Common Pain Points')
);

DELETE FROM public.icp_fields
WHERE field_name IN ('Qualifying Questions', 'Common Objections', 'Common Pain Points');

-- ── 2. Delete "Market Recap" from segment_section_type ──
-- Market Recap is Macro Ecosystem Intel, not ICP Psychology.
-- First rescue any existing segment_entries tied to it into script_inbox.

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
    'market' AS pillar,
    se.created_at,
    NOW() AS updated_at
FROM public.segment_entries se
JOIN public.categories c ON c.id = se.section_type_id
WHERE c.category_type = 'segment_section_type'
  AND c.slug = 'market-recap';

-- Delete segment entries tied to Market Recap
DELETE FROM public.segment_entries
WHERE section_type_id IN (
    SELECT id FROM public.categories
    WHERE category_type = 'segment_section_type'
      AND slug = 'market-recap'
);

-- Delete the Market Recap category itself
DELETE FROM public.categories
WHERE category_type = 'segment_section_type'
  AND slug = 'market-recap';

-- ── 3. Add "Pain Points" as a proper segment_section_type category ──
-- This lives under "The Human ICP (Psychology)" as a rich-text section,
-- not a 1-line firmographic field.

INSERT INTO public.categories (
    project_id, type, category_type, name, slug, icon, color,
    description, sort_order, is_active, metadata
)
SELECT DISTINCT
    project_id,
    'segment_section_type',
    'segment_section_type',
    'Pain Points',
    'pain-points',
    'heart-crack',
    '#ef4444',
    'Deep pain — budgets, frustrations, fears. This is psychology, not a 1-liner.',
    3,
    true,
    '{}'::jsonb
FROM public.categories
WHERE category_type = 'segment'
ON CONFLICT DO NOTHING;
