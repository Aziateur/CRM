-- ============================================================
-- Phase 0: Fix all V2 schema mismatches
-- The V2 migration used different column names than the app code.
-- This migration reconciles DB columns to match lib/*.ts code.
-- ============================================================

-- ─── 1. Fix categories table ───
-- DB has: type TEXT
-- App reads: category_type, slug, metadata
-- Fix: add the missing columns, backfill category_type from type

ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Backfill category_type from type for any existing rows
UPDATE categories SET category_type = type WHERE category_type IS NULL;

-- Backfill slug from name (lowercase, replace spaces/special chars with hyphens)
UPDATE categories SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'gi'))
  WHERE slug IS NULL;

-- Now make category_type NOT NULL
ALTER TABLE categories ALTER COLUMN category_type SET NOT NULL;

-- Index on the column the app actually queries
CREATE INDEX IF NOT EXISTS idx_categories_project_category_type
  ON categories(project_id, category_type);

-- ─── 2. Fix kb_tab_config table ───
-- DB has: tab_key TEXT
-- App reads: slug TEXT
-- Fix: rename tab_key → slug

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_tab_config' AND column_name = 'tab_key'
  ) THEN
    ALTER TABLE kb_tab_config RENAME COLUMN tab_key TO slug;
  END IF;
END $$;

-- The unique constraint references the old column name, recreate it
-- (PostgreSQL automatically renames constraints when columns are renamed,
-- but let's ensure the index is good)
CREATE INDEX IF NOT EXISTS idx_kb_tab_config_project_slug
  ON kb_tab_config(project_id, slug);

-- ─── 3. Fix kb_scripts table ───
-- DB has: body, segment_filter, stage (no is_active column)
-- App reads: content, segment_id, stage_id, is_active
-- Fix: rename columns + add is_active

DO $$
BEGIN
  -- Rename body → content
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_scripts' AND column_name = 'body'
  ) THEN
    ALTER TABLE kb_scripts RENAME COLUMN body TO content;
  END IF;

  -- Rename segment_filter → segment_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_scripts' AND column_name = 'segment_filter'
  ) THEN
    ALTER TABLE kb_scripts RENAME COLUMN segment_filter TO segment_id;
  END IF;

  -- Rename stage → stage_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_scripts' AND column_name = 'stage'
  ) THEN
    ALTER TABLE kb_scripts RENAME COLUMN stage TO stage_id;
  END IF;
END $$;

-- Add is_active column (app reads it, DB doesn't have it)
ALTER TABLE kb_scripts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ─── 4. Fix icp_fields table ───
-- DB has: name TEXT
-- App reads: field_name TEXT
-- Fix: rename name → field_name

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'icp_fields' AND column_name = 'name'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'icp_fields' AND column_name = 'field_name'
    )
  ) THEN
    ALTER TABLE icp_fields RENAME COLUMN name TO field_name;
  END IF;
END $$;

-- Add is_active if missing (app reads it)
ALTER TABLE icp_fields ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
