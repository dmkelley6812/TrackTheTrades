import type { CoachingCue, DbAccount, DbCoachingSettings, DbTrade } from '../types'
import { formatCurrency, formatLocalDate } from './utils'

export const DEFAULT_COACHING_SETTINGS: Omit<DbCoachingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  large_loss_enabled: true,
  large_loss_pct: 2,
  loss_streak_enabled: true,
  loss_streak_count: 3,
  daily_loss_enabled: true,
  daily_loss_pct: 3,
}

// All cues are same-day behavioral nudges (not historical badges), so importing
// old CSVs never retroactively triggers one — only trades dated today count.
export function evaluateCoachingCues(
  allTrades: DbTrade[],
  account: DbAccount,
  settings: DbCoachingSettings,
): CoachingCue[] {
  const startingBalance = account.starting_balance
  if (startingBalance == null || startingBalance <= 0) return []

  const todayStr = formatLocalDate(new Date())
  const todaysTrades = allTrades
    .filter(t => t.trade_date === todayStr)
    .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime())

  if (todaysTrades.length === 0) return []

  const cues: CoachingCue[] = []

  if (settings.large_loss_enabled) {
    const worst = todaysTrades.reduce((w, t) => (t.net_pnl < w.net_pnl ? t : w), todaysTrades[0])
    const threshold = -(settings.large_loss_pct / 100) * startingBalance
    if (worst.net_pnl <= threshold) {
      const pctOfAccount = (Math.abs(worst.net_pnl) / startingBalance) * 100
      cues.push({
        id: `large_loss-${todayStr}`,
        type: 'large_loss',
        title: 'Large Loss Alert',
        message: `Your ${worst.symbol} trade lost ${formatCurrency(worst.net_pnl)} (${pctOfAccount.toFixed(1)}% of account). Consider scaling down size or tightening your stop.`,
      })
    }
  }

  if (settings.loss_streak_enabled) {
    let streak = 0
    for (let i = todaysTrades.length - 1; i >= 0; i--) {
      if (todaysTrades[i].net_pnl < 0) streak++
      else break
    }
    if (streak >= settings.loss_streak_count) {
      cues.push({
        id: `loss_streak-${todayStr}`,
        type: 'loss_streak',
        title: 'Losing Streak',
        message: `You've had ${streak} losses in a row today. Consider stepping away for a bit.`,
      })
    }
  }

  if (settings.daily_loss_enabled) {
    const totalToday = todaysTrades.reduce((s, t) => s + t.net_pnl, 0)
    const threshold = -(settings.daily_loss_pct / 100) * startingBalance
    if (totalToday <= threshold) {
      const pctOfAccount = (Math.abs(totalToday) / startingBalance) * 100
      cues.push({
        id: `daily_loss-${todayStr}`,
        type: 'daily_loss',
        title: 'Daily Loss Limit',
        message: `You're down ${formatCurrency(totalToday)} today (${pctOfAccount.toFixed(1)}% of account). Consider calling it for today.`,
      })
    }
  }

  return cues
}
