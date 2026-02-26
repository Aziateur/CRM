-- Backfill any existing nulls so the NOT NULL constraint succeeds
UPDATE leads SET stage = 'New' WHERE stage IS NULL;

-- Make stage non-nullable with a default
ALTER TABLE leads ALTER COLUMN stage SET NOT NULL;
ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'New';
