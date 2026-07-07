// ─── CSV / Import Types ───────────────────────────────────────────────────────

// Flexible row type — column names differ between old (Title Case) and new (Sentence case) TradeStation exports
export type CSVRow = Record<string, string>

export interface ParsedOrder {
  orderId: string
  symbol: string
  side: 'Buy' | 'Sell'
  orderType: string
  qty: number
  filledQty: number
  limitPrice: number | null
  stopPrice: number | null
  avgFillPrice: number | null
  status: string
  openTime: Date
  closeTime: Date
  duration: string
  commissionFee: number
  expirationDate: string
}

export interface FilledOrder {
  orderId: string
  symbol: string
  side: 'Buy' | 'Sell'
  filledQty: number
  avgFillPrice: number
  fillTime: Date
  commission: number
}

// ─── Trade Types ──────────────────────────────────────────────────────────────

export interface MatchedTrade {
  symbol: string
  direction: 'Long' | 'Short'
  entryTime: Date
  exitTime: Date
  entryPrice: number
  exitPrice: number
  qty: number
  grossPnl: number
  commission: number
  netPnl: number
  pointValue: number
  entryOrderId: string
  exitOrderId: string
  tradeDate: string // YYYY-MM-DD
  durationSeconds: number
}

// ─── Database Types ───────────────────────────────────────────────────────────

export interface DbImport {
  id: string
  user_id: string
  file_name: string
  broker: string
  imported_at: string
  order_count: number
  trade_count: number
}

export interface DbOrder {
  id: string
  user_id: string
  import_id: string | null
  order_id: string
  symbol: string
  side: string
  order_type: string
  qty: number
  filled_qty: number
  limit_price: number | null
  stop_price: number | null
  avg_fill_price: number | null
  status: string
  open_time: string
  close_time: string
  duration: string
  commission_fee: number
  expiration_date: string | null
  created_at: string
}

export interface DbTrade {
  id: string
  user_id: string
  import_id: string | null
  account_id: string | null
  symbol: string
  direction: 'Long' | 'Short'
  entry_time: string
  exit_time: string
  entry_price: number
  exit_price: number
  qty: number
  gross_pnl: number
  commission: number
  net_pnl: number
  trade_date: string
  duration_seconds: number
  point_value: number
  entry_order_id: string
  exit_order_id: string
  created_at: string
}

// ─── Dashboard / Stats Types ──────────────────────────────────────────────────

export interface TradeStats {
  totalNetPnl: number
  totalGrossPnl: number
  totalCommission: number
  totalTrades: number
  winnerCount: number
  loserCount: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  bestTrade: number
  worstTrade: number
  avgTrade: number
  largestWinStreak: number
  largestLossStreak: number
}

export interface DailyPnl {
  date: string
  netPnl: number
  grossPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
}

export interface CumulativePnl {
  date: string
  cumulative: number
  daily: number
}

export interface WeeklyStats {
  weekStart: string   // YYYY-MM-DD (Monday)
  weekEnd: string     // YYYY-MM-DD (Sunday)
  weekLabel: string   // e.g. "Mar 24 – Mar 30"
  netPnl: number
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number
  profitFactor: number
  bestDay: number
  worstDay: number
}

// ─── Date Filter Types ────────────────────────────────────────────────────────

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface DateRange {
  start: Date
  end: Date
  preset: DatePreset
}

// ─── Import Preview Types ─────────────────────────────────────────────────────

export interface ImportPreview {
  allOrders: ParsedOrder[]
  filledOrders: ParsedOrder[]
  matchedTrades: MatchedTrade[]
  existingOrderIds: Set<string>
  newTrades: MatchedTrade[]
  duplicateTrades: MatchedTrade[]
}

// ─── Account Types ────────────────────────────────────────────────────────────

export type AccountType = 'paper' | 'live' | 'demo'
export type ProductType = 'futures' | 'stocks' | 'crypto' | 'forex' | 'options' | 'mixed'

export interface DbAccount {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  product_type: ProductType
  broker: string
  currency: string
  starting_balance: number | null
  color: string
  is_default: boolean
  description: string | null
  created_at: string
  updated_at: string
}

// ─── Goal Types ───────────────────────────────────────────────────────────────

export type GoalType =
  | 'profit_target'    // Reach $X net P&L in a period
  | 'win_rate'         // Sustain X% win rate
  | 'consistent_days'  // Hit X profitable trading days
  | 'consistent_weeks' // Hit X profitable trading weeks
  | 'profit_factor'    // Achieve X profit factor
  | 'trade_count'      // Complete X trades
  | 'max_drawdown'     // Keep max drawdown below $X

export type GoalPeriodType = 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all_time'

export type GoalStatus = 'active' | 'achieved' | 'archived'

export interface DbGoal {
  id: string
  user_id: string
  account_id: string | null
  title: string
  type: GoalType
  period: GoalPeriodType
  period_start: string  // YYYY-MM-DD
  period_end: string    // YYYY-MM-DD
  target_value: number
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface GoalProgress {
  goal: DbGoal
  currentValue: number
  percentComplete: number      // 0–100
  remaining: number            // amount/count still needed (or buffer for max_drawdown)
  paceTarget: number           // where you should be at linear pace right now
  paceDelta: number            // currentValue - paceTarget (+ = ahead, - = behind)
  isAchieved: boolean
  isFailed: boolean            // max_drawdown exceeded its limit
  projectedDate: string | null // YYYY-MM-DD estimated completion
  runRatePerDay: number | null  // units per trading day
  daysRemainingInPeriod: number
  tradingDaysInPeriod: number  // unique trade_dates seen so far
  periodTotalDays: number
  periodDaysElapsed: number
}

// ─── Badge Types ──────────────────────────────────────────────────────────────

export type BadgeCategory = 'milestone' | 'performance' | 'discipline' | 'mastery'

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface BadgeProgress {
  current: number
  target: number
}

export interface BadgeDefinition {
  id: string
  title: string
  description: string
  category: BadgeCategory
  rarity: BadgeRarity
  icon: string                                           // lucide icon name
  progressLabel?: string                                 // optional label shown under progress bar
  check: (trades: DbTrade[]) => boolean
  progress?: (trades: DbTrade[]) => BadgeProgress
}

export interface DbEarnedBadge {
  id: string
  user_id: string
  account_id: string | null
  badge_id: string
  earned_at: string
  created_at: string
}

export interface BadgeWithStatus {
  definition: BadgeDefinition
  isEarned: boolean
  earnedAt?: string
  progress?: BadgeProgress
}

// ─── Coaching Types ───────────────────────────────────────────────────────────

export type CoachingCueType = 'large_loss' | 'loss_streak' | 'daily_loss'

export interface DbCoachingSettings {
  id: string
  user_id: string
  large_loss_enabled: boolean
  large_loss_pct: number
  loss_streak_enabled: boolean
  loss_streak_count: number
  daily_loss_enabled: boolean
  daily_loss_pct: number
  created_at: string
  updated_at: string
}

export interface CoachingCue {
  id: string          // deterministic: `${type}-${todayDateStr}`, used for per-day dismissal
  type: CoachingCueType
  title: string
  message: string
}

// ─── Tax Reserve Types ────────────────────────────────────────────────────────

export type FilingStatus =
  | 'single'
  | 'married_jointly'
  | 'married_separately'
  | 'head_of_household'

export type TaxReserveMode = 'minimum' | 'recommended' | 'conservative'

export type TaxDeductionMethod = 'standard' | 'itemized'

export type TaxReserveStatus = 'behind' | 'on_target' | 'ahead'

export interface DbTaxProfile {
  id: string
  user_id: string
  filing_status: FilingStatus
  state: string
  w2_income: number
  other_ordinary_income: number
  deduction_method: TaxDeductionMethod
  itemized_deduction_amount: number
  reserve_mode: TaxReserveMode
  tax_payments_made: number
  tax_savings_balance: number
  qualifying_children: number
  other_dependents: number
  futures_profit_override: number | null
  stocks_profit_override: number | null
  options_profit_override: number | null
  crypto_profit_override: number | null
  forex_profit_override: number | null
  created_at: string
  updated_at: string
}

export interface TaxBracket {
  min: number
  max: number | null  // null = no upper limit
  rate: number        // decimal, e.g. 0.22 for 22%
}

export interface AssetClassIncome {
  futures: number
  stocks: number
  options: number
  crypto: number
  forex: number
}

export interface TaxIncomeBreakdown {
  w2Income: number
  otherOrdinaryIncome: number
  tradingOrdinaryIncome: number   // futures 40% + stocks + options + crypto + forex
  tradingLTCG: number             // futures 60%
  totalPreDeductionIncome: number
  deduction: number
  taxableOrdinaryIncome: number
  taxableLTCG: number
  adjustedGrossIncome: number
}

export interface TaxCalculationResult {
  income: TaxIncomeBreakdown
  assetIncome: AssetClassIncome
  federalOrdinaryTax: number
  federalLTCGTax: number
  niitTax: number                 // Net Investment Income Tax (3.8%)
  totalFederalTaxBeforeCredits: number
  // Tax credits (reduce liability dollar-for-dollar)
  childTaxCreditGross: number     // before phase-out
  childTaxCreditPhaseOut: number  // reduction due to AGI phase-out
  childTaxCreditNet: number       // actually applied
  totalCredits: number
  totalFederalTax: number         // after credits
  stateTax: number
  stateName: string
  stateEffectiveRate: number
  totalLiability: number          // federal (after credits) + state
  reserveMultiplier: number
  requiredReserveBalance: number
  actualSavingsBalance: number
  taxPaymentsMade: number
  netLiabilityAfterPayments: number
  reserveStatus: TaxReserveStatus
  reserveDifference: number       // positive = ahead, negative = behind
  effectiveTaxRate: number        // totalLiability / AGI
  marginalFederalRate: number
  taxYear: number
}

export interface TaxEngineInput {
  taxYear: number
  filingStatus: FilingStatus
  state: string
  w2Income: number
  otherOrdinaryIncome: number
  deductionMethod: TaxDeductionMethod
  itemizedDeductionAmount: number
  reserveMode: TaxReserveMode
  taxPaymentsMade: number
  taxSavingsBalance: number
  qualifyingChildren: number
  otherDependents: number
  assetIncome: AssetClassIncome
}
