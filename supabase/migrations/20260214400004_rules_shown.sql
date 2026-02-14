-- Phase 7: Telemetry — track which rules were shown before each call
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS rules_shown UUID[] DEFAULT '{}';

COMMENT ON COLUMN attempts.rules_shown IS 'IDs of playbook rules displayed in the call-prep panel before this attempt';
