-- ============================================================================
-- Add field promotion support
-- Allows custom fields to be promoted to real columns on the leads table
-- ============================================================================

-- 1. Add promotion flag to field_definitions
ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN NOT NULL DEFAULT false;

-- 2. RPC: promote a custom field to a real column on leads
CREATE OR REPLACE FUNCTION promote_field_to_column(
  p_field_id UUID,
  p_project_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_field RECORD;
  v_pg_type TEXT;
  v_rows_migrated INT;
BEGIN
  -- Look up the field definition
  SELECT * INTO v_field FROM field_definitions
    WHERE id = p_field_id AND project_id = p_project_id AND entity_type = 'lead';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field definition not found for id=% project=%', p_field_id, p_project_id;
  END IF;

  IF v_field.is_promoted THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'field_key', v_field.field_key);
  END IF;

  -- Map field_type → Postgres type
  v_pg_type := CASE v_field.field_type
    WHEN 'text'         THEN 'TEXT'
    WHEN 'number'       THEN 'NUMERIC'
    WHEN 'boolean'      THEN 'BOOLEAN'
    WHEN 'date'         THEN 'DATE'
    WHEN 'url'          THEN 'TEXT'
    WHEN 'email'        THEN 'TEXT'
    WHEN 'select'       THEN 'TEXT'
    WHEN 'multi_select' THEN 'JSONB'
    ELSE 'TEXT'
  END;

  -- 1. Add column (IF NOT EXISTS is safe for re-runs)
  EXECUTE format(
    'ALTER TABLE leads ADD COLUMN IF NOT EXISTS %I %s',
    v_field.field_key, v_pg_type
  );

  -- 2. Migrate data from custom_fields JSONB → new column
  IF v_pg_type = 'NUMERIC' THEN
    EXECUTE format(
      'UPDATE leads SET %I = (custom_fields->>%L)::numeric WHERE project_id = %L AND custom_fields ? %L AND %I IS NULL',
      v_field.field_key, v_field.field_key, p_project_id, v_field.field_key, v_field.field_key
    );
  ELSIF v_pg_type = 'BOOLEAN' THEN
    EXECUTE format(
      'UPDATE leads SET %I = (custom_fields->>%L)::boolean WHERE project_id = %L AND custom_fields ? %L AND %I IS NULL',
      v_field.field_key, v_field.field_key, p_project_id, v_field.field_key, v_field.field_key
    );
  ELSIF v_pg_type = 'JSONB' THEN
    EXECUTE format(
      'UPDATE leads SET %I = custom_fields->%L WHERE project_id = %L AND custom_fields ? %L AND %I IS NULL',
      v_field.field_key, v_field.field_key, p_project_id, v_field.field_key, v_field.field_key
    );
  ELSIF v_pg_type = 'DATE' THEN
    EXECUTE format(
      'UPDATE leads SET %I = (custom_fields->>%L)::date WHERE project_id = %L AND custom_fields ? %L AND %I IS NULL',
      v_field.field_key, v_field.field_key, p_project_id, v_field.field_key, v_field.field_key
    );
  ELSE
    EXECUTE format(
      'UPDATE leads SET %I = custom_fields->>%L WHERE project_id = %L AND custom_fields ? %L AND %I IS NULL',
      v_field.field_key, v_field.field_key, p_project_id, v_field.field_key, v_field.field_key
    );
  END IF;

  GET DIAGNOSTICS v_rows_migrated = ROW_COUNT;

  -- 3. Remove key from custom_fields JSONB (cleanup)
  EXECUTE format(
    'UPDATE leads SET custom_fields = custom_fields - %L WHERE project_id = %L AND custom_fields ? %L',
    v_field.field_key, p_project_id, v_field.field_key
  );

  -- 4. Flag the field definition as promoted
  UPDATE field_definitions SET is_promoted = true WHERE id = p_field_id;

  RETURN jsonb_build_object(
    'ok', true,
    'field_key', v_field.field_key,
    'pg_type', v_pg_type,
    'rows_migrated', v_rows_migrated
  );
END;
$$;
