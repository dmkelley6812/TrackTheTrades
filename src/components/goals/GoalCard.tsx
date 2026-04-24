import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  DollarSign, Percent, CalendarDays, Calendar, TrendingUp,
  TrendingDown, Hash, Trophy, MoreHorizontal, Archive, Trash2, CheckCircle,
} from 'lucide-react'
import type { GoalProgress, GoalType } from '../../types'
import { formatGoalPeriodLabel } from '../../lib/goals'
import { formatCurrency as fmtCurrency } from '../../lib/utils'

const GOAL_META: Record<GoalType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bgColor: string }> = {
  profit_target:    { icon: DollarSign,   label: 'Profit Target',    color: 'text-profit',      bgColor: 'bg-profit/15' },
  win_rate:         { icon: Percent,       label: 'Win Rate',          color: 'text-accent',      bgColor: 'bg-accent/15' },
  consistent_days:  { icon: CalendarDays,  label: 'Profitable Days',   color: 'text-accent',      bgColor: 'bg-accent/15' },
  consistent_weeks: { icon: Calendar,      label: 'Profitable Weeks',  color: 'text-accent',      bgColor: 'bg-accent/15' },
  profit_factor:    { icon: TrendingUp,    label: 'Profit Factor',     color: 'text-profit',      bgColor: 'bg-profit/15' },
  trade_count:      { icon: Hash,          label: 'Trade Count',       color: 'text-accent',      bgColor: 'bg-accent/15' },
  max_drawdown:     { icon: TrendingDown,  label: 'Max Drawdown',      color: 'text-loss',        bgColor: 'bg-loss/15' },
}

function fmtValue(type: GoalType, value: number): string {
  switch (type) {
    case 'profit_target': return fmtCurrency(value)
    case 'win_rate':       return `${value.toFixed(1)}%`
    case 'consistent_days': return `${Math.floor(value)}`
    case 'consistent_weeks': return `${Math.floor(value)}`
    case 'profit_factor': return `${value.toFixed(2)}x`
    case 'trade_count':   return `${Math.floor(value)}`
    case 'max_drawdown':  return fmtCurrency(value)
  }
}

function fmtUnit(type: GoalType): string {
  switch (type) {
    case 'consistent_days':  return ' days'
    case 'consistent_weeks': return ' weeks'
    case 'trade_count':      return ' trades'
    default: return ''
  }
}

interface GoalCardProps {
  progress: GoalProgress
  onArchive: (id: string) => void
  onMarkAchieved: (id: string) => void
  onDelete: (id: string) => void
}

export default function GoalCard({ progress, onArchive, onMarkAchieved, onDelete }: GoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    goal, currentValue, percentComplete, remaining, paceDelta,
    isAchieved, isFailed, projectedDate, runRatePerDay,
    daysRemainingInPeriod, tradingDaysInPeriod, periodDaysElapsed, periodTotalDays,
  } = progress

  const meta = GOAL_META[goal.type]
  const Icon = meta.icon

  // ── Status ──────────────────────────────────────────────────────────────────
  const getStatus = () => {
    if (goal.status === 'achieved' || isAchieved)
      return { label: 'Achieved', cls: 'text-profit bg-profit/10 border-profit/25' }
    if (isFailed)
      return { label: 'Exceeded', cls: 'text-loss bg-loss/10 border-loss/25' }
    if (tradingDaysInPeriod === 0)
      return { label: 'No Data', cls: 'text-text-muted bg-surface border-border' }
    if (goal.type === 'win_rate' || goal.type === 'profit_factor') {
      if (currentValue >= goal.target_value)
        return { label: 'On Track', cls: 'text-profit bg-profit/10 border-profit/25' }
      return { label: 'Below Target', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' }
    }
    if (goal.type === 'max_drawdown')
      return { label: 'Active', cls: 'text-accent bg-accent/10 border-accent/25' }
    if (projectedDate) {
      if (paceDelta > 0)
        return { label: 'Ahead', cls: 'text-profit bg-profit/10 border-profit/25' }
      return { label: 'On Track', cls: 'text-accent bg-accent/10 border-accent/25' }
    }
    return { label: 'Behind', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' }
  }

  const status = getStatus()

  // ── Progress bar colors ──────────────────────────────────────────────────────
  const barFill =
    goal.status === 'achieved' || isAchieved
      ? 'bg-profit'
      : isFailed
        ? 'bg-loss'
        : goal.type === 'max_drawdown'
          ? percentComplete > 80 ? 'bg-loss' : percentComplete > 55 ? 'bg-amber-400' : 'bg-profit'
          : projectedDate || paceDelta >= 0
            ? 'bg-accent'
            : 'bg-amber-400'

  // Pace marker position for cumulative goals
  const showPaceMarker =
    !['win_rate', 'profit_factor', 'max_drawdown'].includes(goal.type) &&
    tradingDaysInPeriod > 0 &&
    !isAchieved
  const paceMarkerPct = Math.min((progress.paceTarget / goal.target_value) * 100, 100)

  // ── Footer insight line ──────────────────────────────────────────────────────
  const buildInsights = (): string[] => {
    const parts: string[] = []

    if (goal.type === 'max_drawdown') {
      if (remaining >= 0) {
        parts.push(`${fmtCurrency(remaining)} buffer`)
        parts.push(`${percentComplete.toFixed(0)}% of limit used`)
      } else {
        parts.push(`${fmtCurrency(Math.abs(remaining))} over limit`)
      }
      if (daysRemainingInPeriod > 0) parts.push(`${daysRemainingInPeriod}d left`)
      return parts
    }

    if (isAchieved || goal.status === 'achieved') {
      if (goal.type === 'profit_target') parts.push(`Exceeded target by ${fmtCurrency(Math.abs(remaining))}`)
      else parts.push(`Goal completed!`)
      return parts
    }

    if (tradingDaysInPeriod === 0) return ['No trades in this period yet']

    if (goal.type === 'win_rate') {
      const delta = currentValue - goal.target_value
      if (delta < 0) parts.push(`${Math.abs(delta).toFixed(1)}% below target`)
      else parts.push(`${delta.toFixed(1)}% above target`)
      if (daysRemainingInPeriod > 0) parts.push(`${daysRemainingInPeriod}d left`)
      return parts
    }

    if (goal.type === 'profit_factor') {
      const delta = currentValue - goal.target_value
      if (delta < 0) parts.push(`${Math.abs(delta).toFixed(2)}x below target`)
      else parts.push(`${delta.toFixed(2)}x above target`)
      if (daysRemainingInPeriod > 0) parts.push(`${daysRemainingInPeriod}d left`)
      return parts
    }

    // Cumulative goals
    if (remaining > 0) {
      parts.push(`${fmtValue(goal.type, remaining)}${fmtUnit(goal.type)} to go`)
    }

    if (runRatePerDay !== null) {
      if (goal.type === 'profit_target') {
        parts.push(`${fmtCurrency(runRatePerDay)}/day`)
      } else if (goal.type === 'trade_count') {
        parts.push(`${runRatePerDay.toFixed(1)}/day`)
      } else if (goal.type === 'consistent_days') {
        parts.push(`${(runRatePerDay * 100).toFixed(0)}% win-day rate`)
      }
    }

    if (projectedDate && !isAchieved) {
      parts.push(`Est. ${format(parseISO(projectedDate), 'MMM d')}`)
    } else if (!projectedDate && remaining > 0 && tradingDaysInPeriod > 0) {
      parts.push('Behind pace')
    }

    return parts
  }

  const insights = buildInsights()
  const periodLabel = formatGoalPeriodLabel(goal)

  // ── Card border highlight ────────────────────────────────────────────────────
  const cardBorder =
    goal.status === 'achieved' || isAchieved
      ? 'border-profit/30 shadow-profit/5'
      : isFailed
        ? 'border-loss/30'
        : 'border-border'

  return (
    <div className={`bg-surface border ${cardBorder} rounded-xl p-5 flex flex-col gap-4 relative`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${meta.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
          </div>
          <div>
            <div className="text-text-muted text-xs font-medium uppercase tracking-wider leading-none">
              {meta.label}
            </div>
            <div className="text-text-dim text-xs mt-0.5">{periodLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.cls}`}>
            {status.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-hover transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 w-40 bg-base border border-border rounded-lg shadow-2xl z-20 overflow-hidden">
                {isAchieved && goal.status !== 'achieved' && (
                  <button
                    onMouseDown={() => onMarkAchieved(goal.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-profit hover:bg-profit/5 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Complete
                  </button>
                )}
                <button
                  onMouseDown={() => onArchive(goal.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
                <button
                  onMouseDown={() => onDelete(goal.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-loss hover:bg-loss/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Title ── */}
      <div>
        <h3 className="text-text-primary font-semibold text-[15px] leading-snug">{goal.title}</h3>
      </div>

      {/* ── Main metric + progress ── */}
      <div>
        <div className="flex items-end justify-between mb-2.5">
          <div>
            <div className={`text-2xl font-bold tabular-nums ${
              goal.status === 'achieved' || isAchieved
                ? 'text-profit'
                : isFailed
                  ? 'text-loss'
                  : 'text-text-primary'
            }`}>
              {fmtValue(goal.type, currentValue)}
              {fmtUnit(goal.type) && <span className="text-text-muted font-normal text-sm ml-1">{fmtUnit(goal.type).trim()}</span>}
            </div>
            <div className="text-text-muted text-xs mt-0.5">
              of {fmtValue(goal.type, goal.target_value)}{fmtUnit(goal.type)}
              {goal.type === 'max_drawdown' && ' limit'}
            </div>
          </div>
          <div className="text-right">
            {goal.status === 'achieved' || isAchieved ? (
              <Trophy className="w-7 h-7 text-profit ml-auto" />
            ) : (
              <span className="text-2xl font-bold tabular-nums text-text-primary">
                {percentComplete.toFixed(1)}<span className="text-text-muted text-sm font-normal">%</span>
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-2.5 bg-deep rounded-full overflow-visible">
          {/* Pace marker tick */}
          {showPaceMarker && paceMarkerPct > 2 && paceMarkerPct < 98 && (
            <div
              className="absolute top-0 w-0.5 h-2.5 bg-text-dim/50 rounded-full z-10"
              style={{ left: `${paceMarkerPct}%` }}
              title={`Pace target: ${fmtValue(goal.type, progress.paceTarget)}`}
            />
          )}
          {/* Fill */}
          <div
            className={`h-full ${barFill} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(percentComplete, 100)}%` }}
          />
        </div>
        {showPaceMarker && paceMarkerPct > 2 && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-text-dim/50" />
            <span className="text-text-dim text-xs">
              Pace: {fmtValue(goal.type, progress.paceTarget)}{fmtUnit(goal.type)}
              {paceDelta !== 0 && (
                <span className={`ml-1.5 ${paceDelta >= 0 ? 'text-profit' : 'text-amber-400'}`}>
                  ({paceDelta >= 0 ? '+' : ''}{fmtValue(goal.type, paceDelta)}{fmtUnit(goal.type)})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Insight footer ── */}
      {insights.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 border-t border-border">
          {insights.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-text-dim text-xs">·</span>}
              <span className={`text-xs ${
                item.includes('Behind') || item.includes('over limit')
                  ? 'text-amber-400'
                  : item.includes('buffer') || item.includes('Est.') || item.includes('completed')
                    ? 'text-text-muted'
                    : 'text-text-muted'
              }`}>
                {item}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
