import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, parseISO, differenceInCalendarDays,
  addDays, format,
} from 'date-fns'
import type { DbGoal, DbTrade, GoalPeriodType, GoalProgress } from '../types'

// ─── Period Helpers ───────────────────────────────────────────────────────────

export function getPeriodDates(
  period: GoalPeriodType,
  customStart?: string,
  customEnd?: string,
): { start: string; end: string } {
  const now = new Date()
  switch (period) {
    case 'this_week':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    case 'this_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    case 'this_year':
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd'),
      }
    case 'all_time':
      return { start: '2000-01-01', end: '2099-12-31' }
    case 'custom':
      return {
        start: customStart ?? format(startOfMonth(now), 'yyyy-MM-dd'),
        end: customEnd ?? format(endOfMonth(now), 'yyyy-MM-dd'),
      }
  }
}

export function formatGoalPeriodLabel(goal: DbGoal): string {
  switch (goal.period) {
    case 'this_year':
      return format(parseISO(goal.period_start), 'yyyy')
    case 'this_month':
      return format(parseISO(goal.period_start), 'MMMM yyyy')
    case 'this_week':
      return `Week of ${format(parseISO(goal.period_start), 'MMM d')}`
    case 'all_time':
      return 'All Time'
    case 'custom':
      return `${format(parseISO(goal.period_start), 'MMM d')} – ${format(parseISO(goal.period_end), 'MMM d, yyyy')}`
  }
}

// ─── Projection Helpers ───────────────────────────────────────────────────────

function addWorkingDays(from: Date, days: number): Date {
  let count = 0
  let d = new Date(from)
  while (count < Math.ceil(days)) {
    d = addDays(d, 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return d
}

// ─── Progress Computation ─────────────────────────────────────────────────────

export function computeGoalProgress(goal: DbGoal, allTrades: DbTrade[]): GoalProgress {
  const today = new Date()
  const periodStart = parseISO(goal.period_start)
  const periodEnd = parseISO(goal.period_end)
  const effectiveEnd = periodEnd < today ? periodEnd : today

  const periodTotalDays = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1)
  const periodDaysElapsed = Math.max(1, differenceInCalendarDays(effectiveEnd, periodStart) + 1)
  const daysRemainingInPeriod = Math.max(0, differenceInCalendarDays(periodEnd, today))

  const periodTrades = allTrades.filter(
    t => t.trade_date >= goal.period_start && t.trade_date <= goal.period_end,
  )
  const tradingDaysInPeriod = new Set(periodTrades.map(t => t.trade_date)).size

  let currentValue = 0
  let paceTarget = 0
  let isAchieved = false
  let isFailed = false
  let projectedDate: string | null = null
  let runRatePerDay: number | null = null

  switch (goal.type) {
    case 'profit_target': {
      currentValue = periodTrades.reduce((s, t) => s + t.net_pnl, 0)
      paceTarget = (goal.target_value * periodDaysElapsed) / periodTotalDays
      isAchieved = currentValue >= goal.target_value

      if (tradingDaysInPeriod > 0) {
        runRatePerDay = currentValue / tradingDaysInPeriod
        const remaining = goal.target_value - currentValue
        if (remaining > 0 && runRatePerDay > 0) {
          const daysNeeded = remaining / runRatePerDay
          const projected = addWorkingDays(today, daysNeeded)
          projectedDate = projected <= periodEnd ? format(projected, 'yyyy-MM-dd') : null
        }
      }
      break
    }

    case 'win_rate': {
      if (periodTrades.length > 0) {
        const winners = periodTrades.filter(t => t.net_pnl > 0)
        currentValue = (winners.length / periodTrades.length) * 100
      }
      // Win rate is a ratio goal, not cumulative — pace = the target itself
      paceTarget = goal.target_value
      isAchieved = currentValue >= goal.target_value && periodTrades.length >= 10
      break
    }

    case 'consistent_days': {
      const dailyPnl = new Map<string, number>()
      for (const t of periodTrades) {
        dailyPnl.set(t.trade_date, (dailyPnl.get(t.trade_date) ?? 0) + t.net_pnl)
      }
      currentValue = Array.from(dailyPnl.values()).filter(v => v > 0).length
      paceTarget = (goal.target_value * periodDaysElapsed) / periodTotalDays
      isAchieved = currentValue >= goal.target_value

      if (tradingDaysInPeriod > 0) {
        const winDayRate = currentValue / tradingDaysInPeriod
        runRatePerDay = winDayRate
        const remaining = goal.target_value - currentValue
        if (remaining > 0 && winDayRate > 0) {
          const daysNeeded = remaining / winDayRate
          const projected = addWorkingDays(today, daysNeeded)
          projectedDate = projected <= periodEnd ? format(projected, 'yyyy-MM-dd') : null
        }
      }
      break
    }

    case 'consistent_weeks': {
      const weeklyPnl = new Map<string, number>()
      for (const t of periodTrades) {
        const d = parseISO(t.trade_date)
        const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        weeklyPnl.set(weekStart, (weeklyPnl.get(weekStart) ?? 0) + t.net_pnl)
      }
      currentValue = Array.from(weeklyPnl.values()).filter(v => v > 0).length
      paceTarget = (goal.target_value * periodDaysElapsed) / periodTotalDays
      isAchieved = currentValue >= goal.target_value

      const totalWeeks = weeklyPnl.size
      if (totalWeeks > 0) {
        const weeklyRate = currentValue / totalWeeks
        runRatePerDay = weeklyRate / 5
        const remaining = goal.target_value - currentValue
        if (remaining > 0 && weeklyRate > 0) {
          const weeksNeeded = remaining / weeklyRate
          const projected = addWorkingDays(today, weeksNeeded * 5)
          projectedDate = projected <= periodEnd ? format(projected, 'yyyy-MM-dd') : null
        }
      }
      break
    }

    case 'profit_factor': {
      const winners = periodTrades.filter(t => t.net_pnl > 0)
      const losers = periodTrades.filter(t => t.net_pnl < 0)
      const grossProfit = winners.reduce((s, t) => s + t.net_pnl, 0)
      const grossLoss = Math.abs(losers.reduce((s, t) => s + t.net_pnl, 0))
      currentValue =
        grossLoss > 0
          ? Number((grossProfit / grossLoss).toFixed(2))
          : grossProfit > 0
            ? 99
            : 0
      paceTarget = goal.target_value
      isAchieved = currentValue >= goal.target_value && periodTrades.length >= 10
      break
    }

    case 'trade_count': {
      currentValue = periodTrades.length
      paceTarget = (goal.target_value * periodDaysElapsed) / periodTotalDays
      isAchieved = currentValue >= goal.target_value

      if (tradingDaysInPeriod > 0) {
        runRatePerDay = currentValue / tradingDaysInPeriod
        const remaining = goal.target_value - currentValue
        if (remaining > 0 && runRatePerDay > 0) {
          const daysNeeded = remaining / runRatePerDay
          const projected = addWorkingDays(today, daysNeeded)
          projectedDate = projected <= periodEnd ? format(projected, 'yyyy-MM-dd') : null
        }
      }
      break
    }

    case 'max_drawdown': {
      let peak = 0
      let maxDD = 0
      let cum = 0
      const sorted = [...periodTrades].sort((a, b) =>
        a.exit_time.localeCompare(b.exit_time),
      )
      for (const t of sorted) {
        cum += t.net_pnl
        if (cum > peak) peak = cum
        const dd = peak - cum
        if (dd > maxDD) maxDD = dd
      }
      currentValue = maxDD
      paceTarget = 0
      isFailed = currentValue > goal.target_value
      isAchieved = daysRemainingInPeriod === 0 && !isFailed
      break
    }
  }

  const percentComplete =
    goal.target_value > 0
      ? Math.min((currentValue / goal.target_value) * 100, 100)
      : 0

  const remaining = goal.target_value - currentValue
  const paceDelta = currentValue - paceTarget

  return {
    goal,
    currentValue,
    percentComplete,
    remaining,
    paceTarget,
    paceDelta,
    isAchieved,
    isFailed,
    projectedDate,
    runRatePerDay,
    daysRemainingInPeriod,
    tradingDaysInPeriod,
    periodTotalDays,
    periodDaysElapsed,
  }
}
