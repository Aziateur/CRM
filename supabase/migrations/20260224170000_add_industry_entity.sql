-- =====================================================
-- Industry Entity + Unified Market Intel Tab
-- =====================================================
-- Creates industry as a first-class category_type,
-- re-parents orphan segments under their industry,
-- and merges the two broken tabs into one.

-- ── 1. Create "Tutoring" industry for each project ──
INSERT INTO categories (project_id, type, category_type, name, slug, icon, color, sort_order, is_active)
SELECT p.id, 'industry', 'industry', 'Tutoring', 'tutoring', 'graduation-cap', '#3b82f6', 0, true
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.project_id = p.id AND c.category_type = 'industry' AND c.slug = 'tutoring'
);

-- ── 2. Re-parent ALL orphan segments under the Tutoring industry ──
UPDATE categories seg
SET parent_id = ind.id
FROM categories ind
WHERE ind.category_type = 'industry'
  AND ind.slug = 'tutoring'
  AND seg.category_type = 'segment'
  AND seg.project_id = ind.project_id
  AND seg.parent_id IS NULL;

-- ── 3. Merge tab config: rename 'icp' → 'market-intel', remove 'intel' ──
UPDATE kb_tab_config SET slug = 'market-intel', label = 'Market Intel'
WHERE slug = 'icp';

DELETE FROM kb_tab_config WHERE slug = 'intel';
