-- ============================================================================
-- Unify friction: migrate from friction_categories to categories table
-- The friction_categories table was a duplicate system. The real categories
-- are in the 'categories' table with type='friction_type'.
-- ============================================================================

-- 1. Drop FK constraint on friction_logs.category_id → friction_categories
ALTER TABLE friction_logs DROP CONSTRAINT IF EXISTS friction_logs_category_id_fkey;

-- 2. Add new FK to categories table (soft — no constraint, for flexibility)
-- We don't add a hard FK because the categories table uses a different structure.
-- The app code will handle validation.

-- 3. Migrate any existing friction_logs that point to friction_categories
-- Map them to the nearest matching category in the categories table by name
UPDATE friction_logs fl
SET category_id = c.id
FROM categories c
WHERE c.project_id = fl.project_id
  AND c.category_type = 'friction_type'
  AND c.name = (
    SELECT fc.name 
    FROM friction_categories fc 
    WHERE fc.id = fl.category_id
  );

-- 4. For any remaining unmapped logs, set to the first friction_type category in their project
UPDATE friction_logs fl
SET category_id = (
  SELECT c.id FROM categories c
  WHERE c.project_id = fl.project_id
    AND c.category_type = 'friction_type'
  ORDER BY c.sort_order ASC
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.id = fl.category_id
);

-- Done — the app code will now read from categories instead of friction_categories
