-- Custom Fields: JSONB storage with field registry
-- Phase 3 of pipeline-tasks-custom-fields plan

-- 1. Create field_definitions table
CREATE TABLE IF NOT EXISTS field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL DEFAULT 'lead',
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'multi_select', 'date', 'boolean', 'url', 'email')),
    options JSONB,
    is_required BOOLEAN DEFAULT false,
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entity_type, field_key)
);

-- 2. Add custom_fields JSONB column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 3. GIN index for JSONB filtering
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN (custom_fields);

-- 4. Enable RLS but allow anon access (no auth)
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to field_definitions"
    ON field_definitions FOR ALL
    USING (true)
    WITH CHECK (true);
