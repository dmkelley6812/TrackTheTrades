-- Track The Trades – Goals Schema
-- Run this in your Supabase SQL Editor after 001_initial.sql

CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL,
  period       TEXT NOT NULL DEFAULT 'this_year',
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'achieved', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals (user_id);
CREATE INDEX IF NOT EXISTS goals_status_idx ON goals (status);
