-- Add tax credit fields to tax_profiles
ALTER TABLE tax_profiles
  ADD COLUMN IF NOT EXISTS qualifying_children INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_dependents    INTEGER NOT NULL DEFAULT 0;
