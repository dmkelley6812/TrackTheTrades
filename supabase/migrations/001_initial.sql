-- Track The Trades – Initial Schema
-- Run this in your Supabase SQL Editor

-- ─── Imports ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  broker      TEXT NOT NULL DEFAULT 'TradeStation',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_count INTEGER NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imports_select" ON imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "imports_insert" ON imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "imports_delete" ON imports FOR DELETE USING (auth.uid() = user_id);

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id       UUID REFERENCES imports(id) ON DELETE SET NULL,
  order_id        TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  side            TEXT NOT NULL,
  order_type      TEXT NOT NULL,
  qty             INTEGER NOT NULL,
  filled_qty      INTEGER NOT NULL DEFAULT 0,
  limit_price     NUMERIC,
  stop_price      NUMERIC,
  avg_fill_price  NUMERIC,
  status          TEXT NOT NULL,
  open_time       TIMESTAMPTZ NOT NULL,
  close_time      TIMESTAMPTZ NOT NULL,
  duration        TEXT,
  commission_fee  NUMERIC NOT NULL DEFAULT 0,
  expiration_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, order_id)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_symbol_idx ON orders (symbol);
CREATE INDEX IF NOT EXISTS orders_close_time_idx ON orders (close_time);

-- ─── Trades ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id        UUID REFERENCES imports(id) ON DELETE SET NULL,
  symbol           TEXT NOT NULL,
  direction        TEXT NOT NULL CHECK (direction IN ('Long', 'Short')),
  entry_time       TIMESTAMPTZ NOT NULL,
  exit_time        TIMESTAMPTZ NOT NULL,
  entry_price      NUMERIC NOT NULL,
  exit_price       NUMERIC NOT NULL,
  qty              INTEGER NOT NULL,
  gross_pnl        NUMERIC NOT NULL,
  commission       NUMERIC NOT NULL DEFAULT 0,
  net_pnl          NUMERIC NOT NULL,
  trade_date       DATE NOT NULL,
  duration_seconds INTEGER,
  point_value      NUMERIC NOT NULL DEFAULT 20,
  entry_order_id   TEXT NOT NULL,
  exit_order_id    TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades_select" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_delete" ON trades FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS trades_user_id_idx ON trades (user_id);
CREATE INDEX IF NOT EXISTS trades_trade_date_idx ON trades (trade_date);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades (symbol);
CREATE INDEX IF NOT EXISTS trades_exit_time_idx ON trades (exit_time);
