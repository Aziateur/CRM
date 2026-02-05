-- Supabase Schema for CRM
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  phone TEXT,
  confirmed_facts TEXT[],
  open_questions TEXT[],
  next_call_objective TEXT,
  segment TEXT NOT NULL DEFAULT 'Unknown',
  is_decision_maker TEXT DEFAULT 'unknown',
  is_fleet_owner TEXT DEFAULT 'unknown',
  operational_context TEXT,
  constraints TEXT[],
  constraint_other TEXT,
  opportunity_angle TEXT,
  website TEXT,
  email TEXT,
  address TEXT,
  lead_source TEXT,
  contacts JSONB DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL
);

-- Attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contact_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  outcome TEXT NOT NULL,
  why TEXT,
  rep_mistake TEXT,
  dm_reached BOOLEAN NOT NULL DEFAULT false,
  next_action TEXT NOT NULL,
  next_action_at TIMESTAMPTZ,
  note TEXT,
  duration_sec INTEGER DEFAULT 0,
  experiment_tag TEXT,
  session_id TEXT,
  matters_most TEXT,
  is_top_call BOOLEAN,
  is_bottom_call BOOLEAN,
  created_at TEXT NOT NULL,
  open_phone_call_id TEXT,
  direction TEXT,
  dialed_number TEXT,
  answered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recording_url TEXT,
  recording_duration_sec INTEGER,
  transcript JSONB,
  call_summary TEXT,
  status TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_lead_id ON attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp);
CREATE INDEX IF NOT EXISTS idx_attempts_outcome ON attempts(outcome);

-- Enable Row Level Security (RLS) - Optional but recommended
-- Uncomment these if you want to enable RLS

-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- For production, create more restrictive policies based on user authentication

-- CREATE POLICY "Enable all access for leads" ON leads FOR ALL USING (true);
-- CREATE POLICY "Enable all access for attempts" ON attempts FOR ALL USING (true);
