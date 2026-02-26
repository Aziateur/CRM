-- Phase 2: Dial Modes + Queue Snapshot
-- Adds mode selection to dial_sessions and a snapshot table for queue items

-- 1. Add mode + filters to dial_sessions
ALTER TABLE dial_sessions
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS filters JSONB;

-- 2. Create dial_session_items — snapshot of the queue at session start
CREATE TABLE IF NOT EXISTS dial_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dial_session_id UUID NOT NULL REFERENCES dial_sessions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id),
  position INT NOT NULL,
  source TEXT NOT NULL, -- 'task' | 'new' | 'followup' | 'interested' | 'nurture' | 'stale'
  reason TEXT NOT NULL, -- human-readable: "Overdue 3d: Follow up with X"
  task_id UUID REFERENCES tasks(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'called' | 'skipped'
  attempt_id UUID REFERENCES attempts(id),
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_dsi_session ON dial_session_items(dial_session_id);
CREATE INDEX IF NOT EXISTS idx_dsi_lead ON dial_session_items(lead_id);
CREATE INDEX IF NOT EXISTS idx_dsi_status ON dial_session_items(dial_session_id, status);

-- RLS
ALTER TABLE dial_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dial_session_items_select" ON dial_session_items
  FOR SELECT USING (is_member_of(project_id));

CREATE POLICY "dial_session_items_insert" ON dial_session_items
  FOR INSERT WITH CHECK (is_member_of(project_id));

CREATE POLICY "dial_session_items_update" ON dial_session_items
  FOR UPDATE USING (is_member_of(project_id));

CREATE POLICY "dial_session_items_delete" ON dial_session_items
  FOR DELETE USING (is_member_of(project_id));
