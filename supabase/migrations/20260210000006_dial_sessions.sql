-- Dial session persistence (no auth — uses client_id from localStorage)
CREATE TABLE IF NOT EXISTS dial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  target INT,
  experiment TEXT,
  current_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dial_sessions_active_client
  ON dial_sessions (client_id, started_at DESC)
  WHERE status = 'active';

ALTER TABLE dial_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON dial_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
