import type { BadgeDefinition, BadgeWithStatus, DbEarnedBadge, DbTrade } from '../types'
import { computeDailyPnl, computeStats, computeWeeklyStats } from './utils'

// ─── Private helpers ──────────────────────────────────────────────────────────

function longestProfitableDayStreak(trades: DbTrade[]): number {
  const daily = computeDailyPnl(trades)
  let streak = 0
  let max = 0
  for (const d of daily) {
    if (d.netPnl > 0) { streak++; max = Math.max(max, streak) }
    else { streak = 0 }
  }
  return max
}

function distinctTradingDays(trades: DbTrade[]): number {
  return new Set(trades.map(t => t.trade_date)).size
}

// Returns the highest number of unique trading days within a single calendar month
function maxTradingDaysInAMonth(trades: DbTrade[]): number {
  const byMonth = new Map<string, Set<string>>()
  for (const t of trades) {
    const month = t.trade_date.slice(0, 7) // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, new Set())
    byMonth.get(month)!.add(t.trade_date)
  }
  let max = 0
  for (const days of byMonth.values()) max = Math.max(max, days.size)
  return max
}

// Returns true if any Mon–Fri calendar week has at least one trade on each weekday
function hasFullTradingWeek(trades: DbTrade[]): boolean {
  const dateSet = new Set(trades.map(t => t.trade_date))

  for (const dateStr of dateSet) {
    const d = new Date(dateStr + 'T12:00:00Z')
    const dow = d.getUTCDay() // 0=Sun, 1=Mon ... 5=Fri
    if (dow < 1 || dow > 5) continue

    // Walk back to Monday of this week
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - (dow - 1))

    let allFiveDays = true
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday)
      day.setUTCDate(monday.getUTCDate() + i)
      const iso = day.toISOString().slice(0, 10)
      if (!dateSet.has(iso)) { allFiveDays = false; break }
    }
    if (allFiveDays) return true
  }
  return false
}

// Last N trades win rate
function recentWinRate(trades: DbTrade[], n: number): number {
  if (trades.length < n) return 0
  const recent = [...trades]
    .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime())
    .slice(-n)
  return recent.filter(t => t.net_pnl > 0).length / n
}

// Average trade over the last N trades
function recentAvgTrade(trades: DbTrade[], n: number): number {
  if (trades.length < n) return 0
  const recent = [...trades]
    .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime())
    .slice(-n)
  return recent.reduce((s, t) => s + t.net_pnl, 0) / n
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Milestone ────────────────────────────────────────────────────────────────
  {
    id: 'first_trade',
    title: 'First Steps',
    description: 'Log your very first trade.',
    category: 'milestone',
    rarity: 'common',
    icon: 'Footprints',
    check: (trades) => trades.length >= 1,
    progress: (trades) => ({ current: Math.min(trades.length, 1), target: 1 }),
  },
  {
    id: 'first_profitable_day',
    title: 'In The Green',
    description: 'Finish a trading day with positive net P&L.',
    category: 'milestone',
    rarity: 'common',
    icon: 'TrendingUp',
    check: (trades) => computeDailyPnl(trades).some(d => d.netPnl > 0),
  },
  {
    id: 'first_big_day',
    title: 'Big Day',
    description: 'Post a single-day net P&L of $500 or more.',
    category: 'milestone',
    rarity: 'rare',
    icon: 'Rocket',
    check: (trades) => computeDailyPnl(trades).some(d => d.netPnl >= 500),
    progress: (trades) => ({
      current: Math.round(Math.max(0, ...computeDailyPnl(trades).map(d => d.netPnl))),
      target: 500,
    }),
  },
  {
    id: 'first_big_week',
    title: 'Power Week',
    description: 'Post a single-week net P&L of $1,000 or more.',
    category: 'milestone',
    rarity: 'rare',
    icon: 'Zap',
    check: (trades) => computeWeeklyStats(trades, 52).some(w => w.netPnl >= 1000),
    progress: (trades) => ({
      current: Math.round(Math.max(0, ...computeWeeklyStats(trades, 52).map(w => w.netPnl))),
      target: 1000,
    }),
  },
  {
    id: 'trades_10',
    title: 'Getting Started',
    description: 'Log 10 trades.',
    category: 'milestone',
    rarity: 'common',
    icon: 'Hash',
    check: (trades) => trades.length >= 10,
    progress: (trades) => ({ current: Math.min(trades.length, 10), target: 10 }),
  },
  {
    id: 'trades_50',
    title: 'Building Reps',
    description: 'Log 50 trades.',
    category: 'milestone',
    rarity: 'rare',
    icon: 'Layers',
    check: (trades) => trades.length >= 50,
    progress: (trades) => ({ current: Math.min(trades.length, 50), target: 50 }),
  },
  {
    id: 'trades_100',
    title: 'Centurion',
    description: 'Log 100 trades.',
    category: 'milestone',
    rarity: 'epic',
    icon: 'Medal',
    check: (trades) => trades.length >= 100,
    progress: (trades) => ({ current: Math.min(trades.length, 100), target: 100 }),
  },

  // ── Performance ───────────────────────────────────────────────────────────────
  {
    id: 'win_streak_3',
    title: 'Hot Hand',
    description: 'Win 3 trades in a row.',
    category: 'performance',
    rarity: 'common',
    icon: 'Flame',
    check: (trades) => computeStats(trades).largestWinStreak >= 3,
    progress: (trades) => ({ current: Math.min(computeStats(trades).largestWinStreak, 3), target: 3 }),
  },
  {
    id: 'win_streak_5',
    title: 'On Fire',
    description: 'Win 5 trades in a row.',
    category: 'performance',
    rarity: 'rare',
    icon: 'Flame',
    check: (trades) => computeStats(trades).largestWinStreak >= 5,
    progress: (trades) => ({ current: Math.min(computeStats(trades).largestWinStreak, 5), target: 5 }),
  },
  {
    id: 'win_streak_10',
    title: 'Unstoppable',
    description: 'Win 10 trades in a row.',
    category: 'performance',
    rarity: 'epic',
    icon: 'Sparkles',
    check: (trades) => computeStats(trades).largestWinStreak >= 10,
    progress: (trades) => ({ current: Math.min(computeStats(trades).largestWinStreak, 10), target: 10 }),
  },
  {
    id: 'win_rate_60',
    title: 'Sharp Shooter',
    description: 'Hit a 60%+ win rate over your last 20 trades.',
    category: 'performance',
    rarity: 'rare',
    icon: 'Target',
    check: (trades) => trades.length >= 20 && recentWinRate(trades, 20) >= 0.6,
    progress: (trades) => ({
      current: Math.round(recentWinRate(trades, Math.min(trades.length, 20)) * 100),
      target: 60,
    }),
  },
  {
    id: 'profit_factor_2',
    title: 'Edge Confirmed',
    description: 'Achieve a profit factor of 2.0 or higher (all trades).',
    category: 'performance',
    rarity: 'epic',
    icon: 'BarChart2',
    check: (trades) => trades.length >= 10 && computeStats(trades).profitFactor >= 2,
    progress: (trades) => ({
      current: Math.round(Math.min(computeStats(trades).profitFactor, 2) * 100) / 100,
      target: 2,
    }),
  },
  {
    id: 'positive_expectancy',
    title: 'Positive Edge',
    description: 'Average trade P&L is positive over your last 20 trades.',
    category: 'performance',
    rarity: 'rare',
    icon: 'TrendingUp',
    check: (trades) => trades.length >= 20 && recentAvgTrade(trades, 20) > 0,
  },

  // ── Discipline ────────────────────────────────────────────────────────────────
  {
    id: 'active_7_days',
    title: 'Showing Up',
    description: 'Trade on 7 distinct calendar days.',
    category: 'discipline',
    rarity: 'common',
    icon: 'CalendarCheck',
    check: (trades) => distinctTradingDays(trades) >= 7,
    progress: (trades) => ({ current: Math.min(distinctTradingDays(trades), 7), target: 7 }),
  },
  {
    id: 'active_30_days',
    title: 'Consistent Presence',
    description: 'Trade on 30 distinct calendar days.',
    category: 'discipline',
    rarity: 'rare',
    icon: 'Calendar',
    check: (trades) => distinctTradingDays(trades) >= 30,
    progress: (trades) => ({ current: Math.min(distinctTradingDays(trades), 30), target: 30 }),
  },
  {
    id: 'consistent_week',
    title: 'Full Week',
    description: 'Log at least one trade every day Mon–Fri in a single week.',
    category: 'discipline',
    rarity: 'rare',
    icon: 'CheckSquare',
    check: (trades) => hasFullTradingWeek(trades),
  },
  {
    id: 'active_month',
    title: 'Month Warrior',
    description: 'Trade on 15+ days within a single calendar month.',
    category: 'discipline',
    rarity: 'epic',
    icon: 'CalendarDays',
    check: (trades) => maxTradingDaysInAMonth(trades) >= 15,
    progress: (trades) => ({ current: Math.min(maxTradingDaysInAMonth(trades), 15), target: 15 }),
  },

  // ── Mastery ───────────────────────────────────────────────────────────────────
  {
    id: 'profitable_streak_5',
    title: 'Green Machine',
    description: 'Post 5 consecutive profitable trading days.',
    category: 'mastery',
    rarity: 'rare',
    icon: 'Award',
    check: (trades) => longestProfitableDayStreak(trades) >= 5,
    progress: (trades) => ({ current: Math.min(longestProfitableDayStreak(trades), 5), target: 5 }),
  },
  {
    id: 'profitable_streak_10',
    title: 'Streak Master',
    description: 'Post 10 consecutive profitable trading days.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'Trophy',
    check: (trades) => longestProfitableDayStreak(trades) >= 10,
    progress: (trades) => ({ current: Math.min(longestProfitableDayStreak(trades), 10), target: 10 }),
  },
  {
    id: 'profitable_streak_20',
    title: 'Unstoppable Force',
    description: 'Post 20 consecutive profitable trading days.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'Swords',
    check: (trades) => longestProfitableDayStreak(trades) >= 20,
    progress: (trades) => ({ current: Math.min(longestProfitableDayStreak(trades), 20), target: 20 }),
  },
  {
    id: 'profitable_streak_30',
    title: 'The Legend',
    description: 'Post 30 consecutive profitable trading days.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Crown',
    check: (trades) => longestProfitableDayStreak(trades) >= 30,
    progress: (trades) => ({ current: Math.min(longestProfitableDayStreak(trades), 30), target: 30 }),
  },
  {
    id: 'profit_1k',
    title: 'Four Figures',
    description: 'Accumulate $1,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'rare',
    icon: 'DollarSign',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 1000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 1000,
    }),
  },
  {
    id: 'profit_5k',
    title: 'Five Grand',
    description: 'Accumulate $5,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'rare',
    icon: 'Banknote',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 5000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 5000,
    }),
  },
  {
    id: 'profit_10k',
    title: 'Five Figures',
    description: 'Accumulate $10,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'Gem',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 10000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 10000,
    }),
  },
  {
    id: 'profit_25k',
    title: 'Quarter Century',
    description: 'Accumulate $25,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'CircleDollarSign',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 25000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 25000,
    }),
  },
  {
    id: 'profit_50k',
    title: 'Halfway There',
    description: 'Accumulate $50,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'epic',
    icon: 'Wallet',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 50000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 50000,
    }),
  },
  {
    id: 'profit_100k',
    title: 'Six Figures',
    description: 'Accumulate $100,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Landmark',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 100000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 100000,
    }),
  },
  {
    id: 'profit_200k',
    title: 'High Roller',
    description: 'Accumulate $200,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Building2',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 200000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 200000,
    }),
  },
  {
    id: 'profit_500k',
    title: 'Half a Million',
    description: 'Accumulate $500,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Star',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 500000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 500000,
    }),
  },
  {
    id: 'profit_750k',
    title: 'Three Quarter Mil',
    description: 'Accumulate $750,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Shield',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 750000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 750000,
    }),
  },
  {
    id: 'profit_1m',
    title: 'The Millionaire',
    description: 'Accumulate $1,000,000 in all-time net P&L.',
    category: 'mastery',
    rarity: 'legendary',
    icon: 'Infinity',
    progressLabel: 'All-time net P&L',
    check: (trades) => computeStats(trades).totalNetPnl >= 1000000,
    progress: (trades) => ({
      current: Math.round(Math.max(0, computeStats(trades).totalNetPnl)),
      target: 1000000,
    }),
  },

  // ── More Performance ──────────────────────────────────────────────────────────
  {
    id: 'win_streak_15',
    title: 'Unstoppable',
    description: 'Win 15 trades in a row.',
    category: 'performance',
    rarity: 'epic',
    icon: 'Zap',
    check: (trades) => computeStats(trades).largestWinStreak >= 15,
    progress: (trades) => ({ current: Math.min(computeStats(trades).largestWinStreak, 15), target: 15 }),
  },
  {
    id: 'win_rate_70',
    title: 'Sniper',
    description: 'Hit a 70%+ win rate over your last 20 trades.',
    category: 'performance',
    rarity: 'epic',
    icon: 'Crosshair',
    check: (trades) => trades.length >= 20 && recentWinRate(trades, 20) >= 0.7,
    progress: (trades) => ({
      current: Math.round(recentWinRate(trades, Math.min(trades.length, 20)) * 100),
      target: 70,
    }),
  },
  {
    id: 'win_rate_80',
    title: 'Laser Focused',
    description: 'Hit an 80%+ win rate over your last 20 trades.',
    category: 'performance',
    rarity: 'legendary',
    icon: 'Crosshair',
    check: (trades) => trades.length >= 20 && recentWinRate(trades, 20) >= 0.8,
    progress: (trades) => ({
      current: Math.round(recentWinRate(trades, Math.min(trades.length, 20)) * 100),
      target: 80,
    }),
  },
  {
    id: 'profit_factor_3',
    title: 'Edge Lord',
    description: 'Achieve a profit factor of 3.0 or higher (all trades).',
    category: 'performance',
    rarity: 'legendary',
    icon: 'Scale',
    check: (trades) => trades.length >= 10 && computeStats(trades).profitFactor >= 3,
    progress: (trades) => ({
      current: Math.round(Math.min(computeStats(trades).profitFactor, 3) * 100) / 100,
      target: 3,
    }),
  },
  {
    id: 'big_day_2k',
    title: 'Monster Day',
    description: 'Post a single-day net P&L of $2,000 or more.',
    category: 'performance',
    rarity: 'epic',
    icon: 'Rocket',
    check: (trades) => computeDailyPnl(trades).some(d => d.netPnl >= 2000),
    progress: (trades) => ({
      current: Math.round(Math.max(0, ...computeDailyPnl(trades).map(d => d.netPnl))),
      target: 2000,
    }),
  },
  {
    id: 'big_day_5k',
    title: 'Five Figure Day',
    description: 'Post a single-day net P&L of $5,000 or more.',
    category: 'performance',
    rarity: 'legendary',
    icon: 'TrendingUp',
    check: (trades) => computeDailyPnl(trades).some(d => d.netPnl >= 5000),
    progress: (trades) => ({
      current: Math.round(Math.max(0, ...computeDailyPnl(trades).map(d => d.netPnl))),
      target: 5000,
    }),
  },
  {
    id: 'big_week_5k',
    title: 'Five Figure Week',
    description: 'Post a single-week net P&L of $5,000 or more.',
    category: 'performance',
    rarity: 'epic',
    icon: 'BarChart2',
    check: (trades) => computeWeeklyStats(trades, 52).some(w => w.netPnl >= 5000),
    progress: (trades) => ({
      current: Math.round(Math.max(0, ...computeWeeklyStats(trades, 52).map(w => w.netPnl))),
      target: 5000,
    }),
  },

  // ── More Milestones ───────────────────────────────────────────────────────────
  {
    id: 'trades_250',
    title: 'Grinder',
    description: 'Log 250 trades.',
    category: 'milestone',
    rarity: 'epic',
    icon: 'BarChart3',
    check: (trades) => trades.length >= 250,
    progress: (trades) => ({ current: Math.min(trades.length, 250), target: 250 }),
  },
  {
    id: 'trades_500',
    title: 'Veteran',
    description: 'Log 500 trades.',
    category: 'milestone',
    rarity: 'epic',
    icon: 'Activity',
    check: (trades) => trades.length >= 500,
    progress: (trades) => ({ current: Math.min(trades.length, 500), target: 500 }),
  },
  {
    id: 'trades_1000',
    title: 'Elite Trader',
    description: 'Log 1,000 trades.',
    category: 'milestone',
    rarity: 'legendary',
    icon: 'Database',
    check: (trades) => trades.length >= 1000,
    progress: (trades) => ({ current: Math.min(trades.length, 1000), target: 1000 }),
  },

  // ── More Discipline ───────────────────────────────────────────────────────────
  {
    id: 'active_50_days',
    title: 'Dedicated',
    description: 'Trade on 50 distinct calendar days.',
    category: 'discipline',
    rarity: 'epic',
    icon: 'CalendarRange',
    check: (trades) => distinctTradingDays(trades) >= 50,
    progress: (trades) => ({ current: Math.min(distinctTradingDays(trades), 50), target: 50 }),
  },
  {
    id: 'active_100_days',
    title: 'Iron Discipline',
    description: 'Trade on 100 distinct calendar days.',
    category: 'discipline',
    rarity: 'legendary',
    icon: 'CalendarHeart',
    check: (trades) => distinctTradingDays(trades) >= 100,
    progress: (trades) => ({ current: Math.min(distinctTradingDays(trades), 100), target: 100 }),
  },
]

// ─── Engine ───────────────────────────────────────────────────────────────────

export function computeBadgeStatuses(
  trades: DbTrade[],
  earnedBadges: DbEarnedBadge[]
): BadgeWithStatus[] {
  const earnedMap = new Map(earnedBadges.map(b => [b.badge_id, b.earned_at]))

  return BADGE_DEFINITIONS.map(def => {
    const earnedAt = earnedMap.get(def.id)
    const isEarned = earnedAt != null

    return {
      definition: def,
      isEarned,
      earnedAt,
      progress: !isEarned && def.progress ? def.progress(trades) : undefined,
    }
  })
}

// Returns definitions for badges that are newly eligible but not yet in earnedBadges
export function checkNewlyEarned(
  trades: DbTrade[],
  earnedBadges: DbEarnedBadge[]
): BadgeDefinition[] {
  const alreadyEarned = new Set(earnedBadges.map(b => b.badge_id))
  return BADGE_DEFINITIONS.filter(
    def => !alreadyEarned.has(def.id) && def.check(trades)
  )
}
