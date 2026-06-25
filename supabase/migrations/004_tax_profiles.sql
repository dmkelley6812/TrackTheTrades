-- Tax profiles table: one row per user (tax is filed at person level, not per account)
CREATE TABLE IF NOT EXISTS tax_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Filing information
  filing_status             TEXT NOT NULL DEFAULT 'single'
                              CHECK (filing_status IN ('single','married_jointly','married_separately','head_of_household')),
  state                     TEXT NOT NULL DEFAULT 'TX',

  -- Non-trading income
  w2_income                 NUMERIC NOT NULL DEFAULT 0,
  other_ordinary_income     NUMERIC NOT NULL DEFAULT 0,

  -- Deductions
  deduction_method          TEXT NOT NULL DEFAULT 'standard'
                              CHECK (deduction_method IN ('standard','itemized')),
  itemized_deduction_amount NUMERIC NOT NULL DEFAULT 0,

  -- Reserve settings
  reserve_mode              TEXT NOT NULL DEFAULT 'recommended'
                              CHECK (reserve_mode IN ('minimum','recommended','conservative')),
  tax_payments_made         NUMERIC NOT NULL DEFAULT 0,
  tax_savings_balance       NUMERIC NOT NULL DEFAULT 0,

  -- Manual overrides for asset-class YTD profit (NULL = use auto-computed from trades)
  futures_profit_override   NUMERIC,
  stocks_profit_override    NUMERIC,
  options_profit_override   NUMERIC,
  crypto_profit_override    NUMERIC,
  forex_profit_override     NUMERIC,

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Row-level security
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_profiles_select" ON tax_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tax_profiles_insert" ON tax_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tax_profiles_update" ON tax_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tax_profiles_delete" ON tax_profiles
  FOR DELETE USING (auth.uid() = user_id);
