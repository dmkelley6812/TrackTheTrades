-- Coaching settings: one row per user (a personal preference, not per-account,
-- mirroring tax_profiles). Thresholds are percentages of the active account's
-- starting_balance, evaluated at read time in the app.
CREATE TABLE IF NOT EXISTS coaching_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  large_loss_enabled    BOOLEAN NOT NULL DEFAULT true,
  large_loss_pct        NUMERIC NOT NULL DEFAULT 2,   -- single trade loss, % of starting_balance

  loss_streak_enabled   BOOLEAN NOT NULL DEFAULT true,
  loss_streak_count     INT NOT NULL DEFAULT 3,        -- consecutive losing trades today

  daily_loss_enabled    BOOLEAN NOT NULL DEFAULT true,
  daily_loss_pct        NUMERIC NOT NULL DEFAULT 3,    -- today's cumulative loss, % of starting_balance

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Row-level security
ALTER TABLE coaching_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_settings_select" ON coaching_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coaching_settings_insert" ON coaching_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coaching_settings_update" ON coaching_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "coaching_settings_delete" ON coaching_settings
  FOR DELETE USING (auth.uid() = user_id);
