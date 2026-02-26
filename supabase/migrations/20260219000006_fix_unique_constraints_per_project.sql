-- ============================================================================
-- Fix unique constraints to be project-scoped
-- pipeline_stages.name and tags.name were globally unique, which prevents
-- multiple projects from having stages/tags with the same name.
-- ============================================================================

-- 1. Fix pipeline_stages: name must be unique per project, not globally
ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_project_name_unique
  ON pipeline_stages (project_id, name);

-- 2. Fix tags: name must be unique per project, not globally
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS tags_project_name_unique
  ON tags (project_id, name);

-- Done
