-- ============================================================================
-- Cleanup field_definitions: remove orphans, add proper unique constraint
-- ============================================================================

-- 1. Delete orphaned rows (project_id IS NULL)
DELETE FROM field_definitions WHERE project_id IS NULL;

-- 2. Drop the old unique constraint that doesn't include project_id
ALTER TABLE field_definitions
  DROP CONSTRAINT IF EXISTS field_definitions_entity_type_field_key_key;

-- 3. Add proper unique constraint scoped per project
--    Prevents duplicate field_key entries within the same project + entity_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_field_def_project_entity_key'
  ) THEN
    ALTER TABLE field_definitions
      ADD CONSTRAINT uq_field_def_project_entity_key
      UNIQUE (project_id, entity_type, field_key);
  END IF;
END $$;
