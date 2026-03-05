// ─── CSV / Import Types ───────────────────────────────────────────────────────

export interface CSVRow {
  Symbol: string
  Side: string
  Type: string
  Qty: string
  'Filled Qty': string
  'Limit Price': string
  'Stop Price': string
  'Avg Fill Price': string
  Status: string
  'Open Time': string
  'Close Time': string
  Duration: string
  'Commission Fee': string
  'Expiration Date': string
  'Order ID': string
}

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
