-- Phase 2: Configurable Knowledge Base Engine
-- kb_categories: user-defined content categories with configurable display modes
-- kb_entries: knowledge entries belonging to categories
-- kb_entry_parts: ordered sections within entries (for "sections" display mode)

-- ─── Categories ───
CREATE TABLE IF NOT EXISTS kb_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    icon                TEXT DEFAULT '📄',
    display_mode        TEXT NOT NULL DEFAULT 'bullets'
                        CHECK (display_mode IN ('bullets', 'full_text', 'sections')),
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    show_in_prep        BOOLEAN NOT NULL DEFAULT TRUE,  -- visible in Call Prep Panel
    custom_fields_schema JSONB DEFAULT '{}',             -- extensible later
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);

ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kb_categories_project_access" ON kb_categories;
CREATE POLICY "kb_categories_project_access" ON kb_categories
    FOR ALL USING (is_member_of(project_id));

-- ─── Entries ───
CREATE TABLE IF NOT EXISTS kb_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    content             TEXT DEFAULT '',           -- markdown content (for bullets/full_text modes)
    tags                TEXT[] DEFAULT '{}',        -- freeform tags
    segment_filter      TEXT DEFAULT NULL,          -- auto-surface when lead.segment matches
    stage_filter        TEXT DEFAULT NULL,          -- auto-surface when lead.stage matches
    industry_filter     TEXT DEFAULT NULL,          -- auto-surface when lead industry matches
    source_attempt_ids  UUID[] DEFAULT '{}',        -- evidence trail
    is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order          INT NOT NULL DEFAULT 0,
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kb_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kb_entries_project_access" ON kb_entries;
CREATE POLICY "kb_entries_project_access" ON kb_entries
    FOR ALL USING (is_member_of(project_id));

CREATE INDEX IF NOT EXISTS idx_kb_entries_category ON kb_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_project ON kb_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_segment ON kb_entries(segment_filter) WHERE segment_filter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_entries_stage ON kb_entries(stage_filter) WHERE stage_filter IS NOT NULL;

-- ─── Entry Parts (for "sections" display mode) ───
CREATE TABLE IF NOT EXISTS kb_entry_parts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id            UUID NOT NULL REFERENCES kb_entries(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    content             TEXT DEFAULT '',
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kb_entry_parts ENABLE ROW LEVEL SECURITY;
-- Parts inherit access from their entry's project via the entry FK
DROP POLICY IF EXISTS "kb_entry_parts_access" ON kb_entry_parts;
CREATE POLICY "kb_entry_parts_access" ON kb_entry_parts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kb_entries e
            WHERE e.id = kb_entry_parts.entry_id
            AND is_member_of(e.project_id)
        )
    );

CREATE INDEX IF NOT EXISTS idx_kb_entry_parts_entry ON kb_entry_parts(entry_id);
