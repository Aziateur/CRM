-- Add checklist column to tasks for SOP-style subtask checklists
-- Format: [{"label": "Research company", "done": false}, ...]
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
