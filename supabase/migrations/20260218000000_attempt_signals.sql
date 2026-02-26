-- Migrate signals from localStorage to Supabase
-- Signals are Y/N boolean markers tied to a specific attempt and lever key.
-- Used in the learning loop: dialer logs signals → review aggregates them → playbook evolves.

CREATE TABLE IF NOT EXISTS attempt_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  lever_key TEXT NOT NULL,
  value BOOLEAN NOT NULL DEFAULT false,
  project_id UUID NOT NULL REFERENCES projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, lever_key)
);

ALTER TABLE attempt_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attempt_signals_all" ON attempt_signals;
CREATE POLICY "attempt_signals_all" ON attempt_signals FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_attempt_signals_attempt ON attempt_signals(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_signals_project ON attempt_signals(project_id);
CREATE INDEX IF NOT EXISTS idx_attempt_signals_lever ON attempt_signals(lever_key);

COMMENT ON TABLE attempt_signals IS 'Per-attempt Y/N signal markers for framework levers. Replaces localStorage signals.';
