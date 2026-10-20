-- PostgreSQL / Supabase Schema for FlowDesk AI Voice Sales Bot
-- (Matches backend/app/db.py schema exactly)

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  call_state TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (call_state IN ('in_progress', 'processing', 'completed', 'failed')),
  end_reason TEXT,
  consent_given BOOLEAN NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_sec INT DEFAULT 0,
  recording_path TEXT,
  recording_mime TEXT,
  summary TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  sales_status TEXT CHECK (sales_status IN 
    ('converted', 'interested', 'follow_up_required', 'not_interested', 'demo_requested', 'no_response')),
  status_reason TEXT,
  status_evidence TEXT,
  analysis_confidence REAL
);

CREATE INDEX IF NOT EXISTS idx_calls_session_started ON calls (session_id, started_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('bot', 'customer')),
  text TEXT NOT NULL,
  t_start_ms INT,
  t_end_ms INT,
  interrupted BOOLEAN DEFAULT FALSE,
  UNIQUE (call_id, seq)
);
