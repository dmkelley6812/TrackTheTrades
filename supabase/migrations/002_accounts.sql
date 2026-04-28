-- Track The Trades – Accounts Feature
-- Run this in your Supabase SQL Editor after 001_initial.sql

-- ─── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  account_type     TEXT NOT NULL DEFAULT 'paper'
                     CHECK (account_type IN ('paper', 'live', 'demo')),
  product_type     TEXT NOT NULL DEFAULT 'futures'
                     CHECK (product_type IN ('futures', 'stocks', 'crypto', 'forex', 'options', 'mixed')),
  broker           TEXT NOT NULL DEFAULT '',
  currency         TEXT NOT NULL DEFAULT 'USD',
  starting_balance NUMERIC,
  color            TEXT NOT NULL DEFAULT '#4a7cf4',
  is_default       BOOLEAN NOT NULL DEFAULT false,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);

-- ─── Missing UPDATE policies on pre-existing tables ─────────────────────────
-- The initial migration only had SELECT/INSERT/DELETE — UPDATE is needed so the
-- app can stamp account_id on existing rows during the migration step.
CREATE POLICY "imports_update" ON imports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "orders_update"  ON orders  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_update"  ON trades  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Add account_id to existing tables (nullable for backward compat) ─────────
ALTER TABLE imports ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE orders  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE trades  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE goals   ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS imports_account_id_idx ON imports (account_id);
CREATE INDEX IF NOT EXISTS orders_account_id_idx  ON orders  (account_id);
CREATE INDEX IF NOT EXISTS trades_account_id_idx  ON trades  (account_id);
CREATE INDEX IF NOT EXISTS goals_account_id_idx   ON goals   (account_id);
