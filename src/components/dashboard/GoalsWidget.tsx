import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flag, ArrowRight, Plus, Trophy, DollarSign, Percent, CalendarDays, Calendar, TrendingUp, TrendingDown, Hash } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { DbGoal, DbTrade, GoalType } from '../../types'
import { computeGoalProgress, formatGoalPeriodLabel } from '../../lib/goals'
import { formatCurrency } from '../../lib/utils'

// ─── Shared helpers ────────────────────────────────────────────────────────────

const GOAL_ICONS: Record<GoalType, React.ComponentType<{ className?: string }>> = {
  profit_target:    DollarSign,
  win_rate:         Percent,
  consistent_days:  CalendarDays,
  consistent_weeks: Calendar,
  profit_factor:    TrendingUp,
  trade_count:      Hash,
  max_drawdown:     TrendingDown,
}

const GOAL_COLORS: Record<GoalType, string> = {
  profit_target:    'text-profit bg-profit/15',
  win_rate:         'text-accent bg-accent/15',
  consistent_days:  'text-accent bg-accent/15',
  consistent_weeks: 'text-accent bg-accent/15',
  profit_factor:    'text-profit bg-profit/15',
  trade_count:      'text-accent bg-accent/15',
  max_drawdown:     'text-loss bg-loss/15',
}

function fmtVal(type: GoalType, value: number): string {
  switch (type) {
    case 'profit_target':    return formatCurrency(value)
    case 'win_rate':         return `${value.toFixed(1)}%`
    case 'consistent_days':  return `${Math.floor(value)} days`
    case 'consistent_weeks': return `${Math.floor(value)} wks`
    case 'profit_factor':    return `${value.toFixed(2)}x`
    case 'trade_count':      return `${Math.floor(value)} trades`
    case 'max_drawdown':     return formatCurrency(value)
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  goals: DbGoal[]
  allTrades: DbTrade[]
  loading: boolean
}

// ─── Row component ─────────────────────────────────────────────────────────────

function GoalRow({ goal, allTrades }: { goal: DbGoal; allTrades: DbTrade[] }) {
  const p = useMemo(() => computeGoalProgress(goal, allTrades), [goal, allTrades])
  const Icon = GOAL_ICONS[goal.type]
  const iconCls = GOAL_COLORS[goal.type]

  // Status label + color
  const getStatus = () => {
    if (goal.status === 'achieved' || p.isAchieved)
      return { label: 'Achieved', cls: 'text-profit bg-profit/10 border-profit/25' }
    if (p.isFailed)
      return { label: 'Exceeded', cls: 'text-loss bg-loss/10 border-loss/25' }
    if (p.tradingDaysInPeriod === 0)
      return { label: 'No data', cls: 'text-text-dim bg-surface border-border' }
    if (goal.type === 'win_rate' || goal.type === 'profit_factor') {
      return p.currentValue >= goal.target_value
        ? { label: 'On track', cls: 'text-profit bg-profit/10 border-profit/25' }
        : { label: 'Below', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' }
    }
    if (goal.type === 'max_drawdown')
      return { label: 'Active', cls: 'text-accent bg-accent/10 border-accent/25' }
    if (p.projectedDate) {
      return p.paceDelta > 0
        ? { label: 'Ahead', cls: 'text-profit bg-profit/10 border-profit/25' }
        : { label: 'On track', cls: 'text-accent bg-accent/10 border-accent/25' }
    }
    return { label: 'Behind', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' }
  }

  const status = getStatus()

  // Bar fill color
  const barFill =
    goal.status === 'achieved' || p.isAchieved ? 'bg-profit' :
    p.isFailed ? 'bg-loss' :
    goal.type === 'max_drawdown'
      ? p.percentComplete > 80 ? 'bg-loss' : p.percentComplete > 55 ? 'bg-amber-400' : 'bg-profit'
      : p.projectedDate || p.paceDelta >= 0 ? 'bg-accent' : 'bg-amber-400'

  // Compact insight line
  const getInsight = (): string => {
    if (goal.type === 'max_drawdown') {
      const buf = goal.target_value - p.currentValue
      return buf >= 0
        ? `${formatCurrency(p.currentValue)} drawn · ${formatCurrency(buf)} buffer`
        : `${formatCurrency(Math.abs(buf))} over limit`
    }
    if (goal.status === 'achieved' || p.isAchieved) {
      return goal.type === 'profit_target'
        ? `Exceeded by ${formatCurrency(Math.abs(p.remaining))}`
        : 'Goal complete!'
    }
    if (p.tradingDaysInPeriod === 0) return 'No trades in this period yet'

    const parts: string[] = []

    if (goal.type === 'win_rate') {
      const delta = p.currentValue - goal.target_value
      parts.push(delta >= 0 ? `${delta.toFixed(1)}% above target` : `${Math.abs(delta).toFixed(1)}% below target`)
      if (p.daysRemainingInPeriod > 0) parts.push(`${p.daysRemainingInPeriod}d left`)
      return parts.join(' · ')
    }

    if (goal.type === 'profit_factor') {
      const delta = p.currentValue - goal.target_value
      parts.push(delta >= 0 ? `${delta.toFixed(2)}x above target` : `${Math.abs(delta).toFixed(2)}x below target`)
      if (p.daysRemainingInPeriod > 0) parts.push(`${p.daysRemainingInPeriod}d left`)
      return parts.join(' · ')
    }

    if (p.remaining > 0) {
      parts.push(`${fmtVal(goal.type, p.remaining)} to go`)
    }
    if (p.runRatePerDay !== null) {
      if (goal.type === 'profit_target') parts.push(`${formatCurrency(p.runRatePerDay)}/day`)
      else if (goal.type === 'trade_count') parts.push(`${p.runRatePerDay.toFixed(1)}/day`)
      else if (goal.type === 'consistent_days') parts.push(`${(p.runRatePerDay * 100).toFixed(0)}% win-day rate`)
    }
    if (p.projectedDate && !p.isAchieved) {
      parts.push(`Est. ${format(parseISO(p.projectedDate), 'MMM d')}`)
    }
    return parts.slice(0, 3).join(' · ')
  }

  // Pace marker for cumulative goals
  const showPace = !['win_rate', 'profit_factor', 'max_drawdown'].includes(goal.type) && p.tradingDaysInPeriod > 0 && !p.isAchieved
  const pacePct = Math.min((p.paceTarget / goal.target_value) * 100, 100)

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-border/60 last:border-b-0">
      {/* Top row: icon + title + value + status */}
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconCls}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-text-primary text-sm font-medium flex-1 truncate">{goal.title}</span>
        <span className="text-text-muted text-xs tabular-nums font-medium flex-shrink-0">
          {fmtVal(goal.type, p.currentValue)}
          <span className="text-text-dim"> / {fmtVal(goal.type, goal.target_value)}</span>
        </span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="ml-8.5 relative">
        <div className="w-full h-1.5 bg-deep rounded-full overflow-visible relative">
          {showPace && pacePct > 3 && pacePct < 97 && (
            <div
              className="absolute top-0 w-0.5 h-1.5 bg-text-dim/40 rounded-full z-10"
              style={{ left: `${pacePct}%` }}
            />
          )}
          <div
            className={`h-full ${barFill} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(p.percentComplete, 100)}%` }}
          />
        </div>
      </div>

      {/* Insight line */}
      <div className="ml-8.5 flex items-center justify-between">
        <span className="text-text-dim text-xs truncate">{getInsight()}</span>
        <span className="text-text-dim text-xs flex-shrink-0 ml-2 tabular-nums">
          {p.percentComplete.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─── Widget ────────────────────────────────────────────────────────────────────

export default function GoalsWidget({ goals, allTrades, loading }: Props) {
  const activeGoals = useMemo(
    () => goals.filter(g => g.status === 'active'),
    [goals],
  )
  const achievedCount = useMemo(
    () => goals.filter(g => g.status === 'achieved').length,
    [goals],
  )

  const MAX_SHOWN = 4
  const shown = activeGoals.slice(0, MAX_SHOWN)
  const overflow = activeGoals.length - MAX_SHOWN

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="space-y-2 py-3 border-b border-border/60 last:border-b-0">
            <div className="h-4 bg-deep rounded w-3/4 animate-pulse" />
            <div className="h-1.5 bg-deep rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Flag className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-text-muted text-sm font-medium">No goals set</p>
          <p className="text-text-dim text-xs mt-0.5">Track P&L targets, win rates, and more</p>
        </div>
        <Link
          to="/goals"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-lg text-xs font-medium transition-all"
        >
          <Plus className="w-3 h-3" />
          Create a goal
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {achievedCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-profit">
                <Trophy className="w-3 h-3" />
                <span>{achievedCount} achieved</span>
              </div>
            )}
            {achievedCount > 0 && activeGoals.length > 0 && (
              <span className="text-text-dim text-xs">·</span>
            )}
            {activeGoals.length > 0 && (
              <span className="text-text-dim text-xs">{activeGoals.length} active</span>
            )}
          </div>
        </div>
        <Link
          to="/goals"
          className="flex items-center gap-1 text-text-dim hover:text-accent text-xs transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Goal rows */}
      <div>
        {shown.length > 0 ? (
          shown.map(goal => (
            <GoalRow key={goal.id} goal={goal} allTrades={allTrades} />
          ))
        ) : (
          <div className="py-4 text-center">
            <p className="text-text-dim text-xs">All goals achieved or archived.</p>
            <Link to="/goals" className="text-accent text-xs hover:underline mt-1 inline-block">
              Set new goals
            </Link>
          </div>
        )}
      </div>

      {overflow > 0 && (
        <Link
          to="/goals"
          className="flex items-center justify-center gap-1 mt-1 pt-2 border-t border-border/60 text-text-dim hover:text-accent text-xs transition-colors"
        >
          +{overflow} more goal{overflow > 1 ? 's' : ''}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
