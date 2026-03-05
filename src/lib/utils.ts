import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns'
import type { DatePreset, DateRange, DailyPnl, CumulativePnl, TradeStats, DbTrade } from '../types'

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

// ─── Date Range ───────────────────────────────────────────────────────────────

export function getDateRange(preset: DatePreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), preset }
    case 'yesterday': {
      const yesterday = subDays(now, 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday), preset }
    }
    case 'this_week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        preset,
      }
    case 'last_week': {
      const lastWeek = subWeeks(now, 1)
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        preset,
      }
    }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now), preset }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), preset }
    }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now), preset }
    case 'last_year': {
      const lastYear = subYears(now, 1)
      return { start: startOfYear(lastYear), end: endOfYear(lastYear), preset }
    }
    case 'custom':
      return {
        start: customStart ?? startOfMonth(now),
        end: customEnd ?? endOfMonth(now),
        preset,
      }
  }
}

export function formatDateRangeLabel(range: DateRange): string {
  return `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
}

// ─── Stats Computation ────────────────────────────────────────────────────────

export function computeStats(trades: DbTrade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalNetPnl: 0, totalGrossPnl: 0, totalCommission: 0,
      totalTrades: 0, winnerCount: 0, loserCount: 0,
      winRate: 0, avgWin: 0, avgLoss: 0,
      profitFactor: 0, bestTrade: 0, worstTrade: 0,
      avgTrade: 0, largestWinStreak: 0, largestLossStreak: 0,
    }
  }

  const winners = trades.filter(t => t.net_pnl > 0)
  const losers = trades.filter(t => t.net_pnl < 0)

  const totalNetPnl = trades.reduce((s, t) => s + t.net_pnl, 0)
  const totalGrossPnl = trades.reduce((s, t) => s + t.gross_pnl, 0)
  const totalCommission = trades.reduce((s, t) => s + t.commission, 0)

  const grossProfit = winners.reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.net_pnl, 0))

  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  const sortedByTime = [...trades].sort(
    (a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime()
  )

  let winStreak = 0, lossStreak = 0, maxWin = 0, maxLoss = 0
  for (const t of sortedByTime) {
    if (t.net_pnl > 0) {
      winStreak++; lossStreak = 0
      maxWin = Math.max(maxWin, winStreak)
    } else if (t.net_pnl < 0) {
      lossStreak++; winStreak = 0
      maxLoss = Math.max(maxLoss, lossStreak)
    }
  }

  return {
    totalNetPnl,
    totalGrossPnl,
    totalCommission,
    totalTrades: trades.length,
    winnerCount: winners.length,
    loserCount: losers.length,
    winRate: trades.length > 0 ? winners.length / trades.length : 0,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.net_pnl)) : 0,
    worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.net_pnl)) : 0,
    avgTrade: totalNetPnl / trades.length,
    largestWinStreak: maxWin,
    largestLossStreak: maxLoss,
  }
}

export function computeDailyPnl(trades: DbTrade[]): DailyPnl[] {
  const map = new Map<string, DailyPnl>()

  for (const t of trades) {
    const date = t.trade_date
    if (!map.has(date)) {
      map.set(date, { date, netPnl: 0, grossPnl: 0, tradeCount: 0, winCount: 0, lossCount: 0 })
    }
    const d = map.get(date)!
    d.netPnl += t.net_pnl
    d.grossPnl += t.gross_pnl
    d.tradeCount++
    if (t.net_pnl > 0) d.winCount++
    else if (t.net_pnl < 0) d.lossCount++
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function computeCumulativePnl(trades: DbTrade[]): CumulativePnl[] {
  const daily = computeDailyPnl(trades)
  let cumulative = 0
  return daily.map(d => {
    cumulative += d.netPnl
    return { date: d.date, cumulative, daily: d.netPnl }
  })
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

export function pnlColor(value: number): string {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-text-muted'
}

export function pnlBg(value: number): string {
  if (value > 0) return 'bg-profit/10 border-profit/20'
  if (value < 0) return 'bg-loss/10 border-loss/20'
  return 'bg-surface border-border'
}
