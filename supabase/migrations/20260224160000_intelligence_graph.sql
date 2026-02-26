-- =====================================================
-- Intelligence Graph: Unified 3-Altitudes Schema
-- =====================================================
-- Merges kb_entries (System A) + segment_entries/icp_fields/icp_values (System B)
-- into a single intel_entries table with database-enforced altitude routing.

-- 1. Add hierarchy + altitude columns to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS altitude SMALLINT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS cardinality TEXT;

-- 2. Create unified intel_entries table
CREATE TABLE IF NOT EXISTS intel_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id),
    altitude          SMALLINT NOT NULL CHECK (altitude IN (1, 2, 3)),
    industry_id       UUID REFERENCES categories(id),
    segment_id        UUID REFERENCES categories(id),
    intel_category_id UUID NOT NULL REFERENCES categories(id),
    title             TEXT,
    content           TEXT NOT NULL DEFAULT '',
    tags              TEXT[] DEFAULT '{}',
    source            TEXT,
    source_attempt_ids UUID[] DEFAULT '{}',
    is_pinned         BOOLEAN DEFAULT false,
    sort_order        INT DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Altitude 1: MUST have industry, MUST NOT have segment
    CONSTRAINT alt1_needs_industry CHECK (altitude != 1 OR industry_id IS NOT NULL),
    CONSTRAINT alt1_no_segment     CHECK (altitude != 1 OR segment_id IS NULL),
    -- Altitude 2 & 3: MUST have segment
    CONSTRAINT alt23_needs_segment CHECK (altitude NOT IN (2, 3) OR segment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_intel_entries_altitude  ON intel_entries (project_id, altitude);
CREATE INDEX IF NOT EXISTS idx_intel_entries_segment   ON intel_entries (project_id, segment_id)  WHERE segment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intel_entries_industry  ON intel_entries (project_id, industry_id) WHERE industry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_intel_entries_single_value 
    ON intel_entries (project_id, segment_id, intel_category_id) WHERE title IS NULL;

-- 3. Populate altitude + cardinality on existing intel_category rows
UPDATE categories SET altitude = 1, cardinality = 'multi'
    WHERE category_type = 'intel_category' AND slug IN ('competitor-landscape', 'market-trends-conditions', 'regulations-compliance');
UPDATE categories SET altitude = 2, cardinality = 'multi'
    WHERE category_type = 'intel_category' AND slug IN ('how-their-business-works', 'pricing-deal-intelligence', 'technology-tools-they-use', 'buying-process-decision-chain');

-- 4. Convert segment_section_type → intel_category with altitude=3
UPDATE categories SET altitude = 3, cardinality = 'multi', category_type = 'intel_category'
    WHERE category_type = 'segment_section_type';

-- 5. Deactivate Objection Patterns (execution concern, not market intel)
UPDATE categories SET is_active = false WHERE slug = 'objection-patterns';

-- 6. Migrate segment_entries → intel_entries (altitude=3)
INSERT INTO intel_entries (project_id, altitude, segment_id, intel_category_id, title, content, source, tags, is_pinned, sort_order)
SELECT se.project_id, 3, se.segment_id, se.section_type_id, se.title, se.content, se.source,
       COALESCE(se.tags, '{}'), COALESCE(se.is_pinned, false), COALESCE(se.sort_order, 0)
FROM segment_entries se;
