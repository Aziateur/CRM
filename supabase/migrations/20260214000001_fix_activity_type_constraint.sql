-- Fix lead_activities check constraint to include all activity types
-- used by database triggers (call_session, contact_added, contact_removed)

-- Drop the old constraint
ALTER TABLE lead_activities DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;

-- Add the expanded constraint
ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_activity_type_check
  CHECK (activity_type IN (
    'call',
    'call_session',
    'email',
    'sms',
    'note',
    'stage_change',
    'tag_change',
    'field_change',
    'task_created',
    'task_completed',
    'contact_added',
    'contact_removed'
  ));
