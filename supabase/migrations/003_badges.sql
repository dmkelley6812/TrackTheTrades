-- Migration: 003_badges.sql
-- Creates earned_badges table for the gamification/badges feature.
-- badge_id is a TEXT key matching BadgeDefinition.id in src/lib/badges.ts.
-- Unique on (user_id, account_id, badge_id) so the same badge can't be earned
-- twice for the same account. account_id is nullable for future cross-account badges.

CREATE TABLE IF NOT EXISTS earned_badges (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  badge_id     TEXT        NOT NULL,
  earned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT earned_badges_unique UNIQUE (user_id, account_id, badge_id)
);

CREATE INDEX IF NOT EXISTS earned_badges_user_id_idx    ON earned_badges (user_id);
CREATE INDEX IF NOT EXISTS earned_badges_account_id_idx ON earned_badges (account_id);

ALTER TABLE earned_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "earned_badges_select" ON earned_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "earned_badges_insert" ON earned_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "earned_badges_update" ON earned_badges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "earned_badges_delete" ON earned_badges
  FOR DELETE USING (auth.uid() = user_id);
