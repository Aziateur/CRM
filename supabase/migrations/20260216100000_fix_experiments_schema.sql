-- Fix migration: Repair experiments table schema
-- The original CREATE TABLE IF NOT EXISTS did nothing because an older
-- version of the table already existed with a different schema.

-- ─── 1. Add missing columns to experiments ───
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS scope JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS protocol TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS success_definition TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS conclusion TEXT,
  ADD COLUMN IF NOT EXISTS conclusion_type TEXT CHECK (conclusion_type IN ('adopt', 'iterate', 'discard')),
  ADD COLUMN IF NOT EXISTS source_review_id UUID REFERENCES call_reviews(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Migrate old "active" boolean to new "status" text enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'status'
  ) THEN
    ALTER TABLE experiments ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'active', 'paused', 'completed'));
    -- Migrate: active=true → 'active', active=false → 'paused'
    UPDATE experiments SET status = CASE WHEN active THEN 'active' ELSE 'paused' END;
  END IF;
END $$;

-- ─── 2. Backfill project_id for existing experiments ───
-- Set existing experiments to the first available project if project_id is null
UPDATE experiments
  SET project_id = (SELECT id FROM projects LIMIT 1)
  WHERE project_id IS NULL;

-- Now make project_id NOT NULL
DO $$
BEGIN
  -- Only alter if column is still nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'project_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE experiments ALTER COLUMN project_id SET NOT NULL;
  END IF;
END $$;

-- ─── 3. Ensure call_bucket column exists on call_reviews ───
ALTER TABLE call_reviews
  ADD COLUMN IF NOT EXISTS call_bucket TEXT CHECK (call_bucket IN ('top', 'bottom'));

CREATE INDEX IF NOT EXISTS idx_cr_bucket ON call_reviews(call_bucket) WHERE call_bucket IS NOT NULL;

-- ─── 4. Ensure attempts columns for experiments exist ───
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id),
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES experiment_variants(id);

CREATE INDEX IF NOT EXISTS idx_attempts_experiment ON attempts(experiment_id) WHERE experiment_id IS NOT NULL;

-- ─── 5. Re-apply RLS policies for experiments (safe: CREATE IF NOT EXISTS doesn't exist for policies, so use DO block) ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiments' AND policyname = 'experiments_all'
  ) THEN
    EXECUTE 'CREATE POLICY "experiments_all" ON experiments FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ─── 6. Notify PostgREST to reload schema ───
NOTIFY pgrst, 'reload schema';
