import { useState } from 'react'
import {
  DollarSign, Percent, CalendarDays, Calendar, TrendingUp,
  TrendingDown, Hash, X,
} from 'lucide-react'
import type { GoalType, GoalPeriodType, DbGoal } from '../../types'
import { getPeriodDates } from '../../lib/goals'

interface GoalTypeOption {
  type: GoalType
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  defaultPeriod: GoalPeriodType
  defaultTitle: string
  placeholder: string
  unit: string
  min?: number
  max?: number
  step?: number
}

const GOAL_TYPES: GoalTypeOption[] = [
  {
    type: 'profit_target',
    icon: DollarSign,
    label: 'Profit Target',
    description: 'Reach a net P&L goal',
    defaultPeriod: 'this_year',
    defaultTitle: 'Annual Profit Goal',
    placeholder: '250000',
    unit: '$',
    min: 1,
    step: 1000,
  },
  {
    type: 'win_rate',
    icon: Percent,
    label: 'Win Rate',
    description: 'Sustain a win % over a period',
    defaultPeriod: 'this_month',
    defaultTitle: 'Win Rate Goal',
    placeholder: '65',
    unit: '%',
    min: 1,
    max: 100,
    step: 1,
  },
  {
    type: 'consistent_days',
    icon: CalendarDays,
    label: 'Profitable Days',
    description: 'Hit X green trading days',
    defaultPeriod: 'this_year',
    defaultTitle: 'Profitable Days Goal',
    placeholder: '200',
    unit: 'days',
    min: 1,
    step: 1,
  },
  {
    type: 'consistent_weeks',
    icon: Calendar,
    label: 'Profitable Weeks',
    description: 'Hit X profitable trading weeks',
    defaultPeriod: 'this_year',
    defaultTitle: 'Profitable Weeks Goal',
    placeholder: '40',
    unit: 'weeks',
    min: 1,
    step: 1,
  },
  {
    type: 'profit_factor',
    icon: TrendingUp,
    label: 'Profit Factor',
    description: 'Achieve a profit factor of X',
    defaultPeriod: 'this_month',
    defaultTitle: 'Profit Factor Goal',
    placeholder: '2.0',
    unit: 'x',
    min: 1,
    max: 20,
    step: 0.1,
  },
  {
    type: 'trade_count',
    icon: Hash,
    label: 'Trade Count',
    description: 'Complete a target # of trades',
    defaultPeriod: 'this_month',
    defaultTitle: 'Trade Count Goal',
    placeholder: '100',
    unit: 'trades',
    min: 1,
    step: 1,
  },
  {
    type: 'max_drawdown',
    icon: TrendingDown,
    label: 'Max Drawdown',
    description: 'Keep drawdown below a limit',
    defaultPeriod: 'this_month',
    defaultTitle: 'Drawdown Limit',
    placeholder: '5000',
    unit: '$',
    min: 1,
    step: 500,
  },
]

const PERIOD_OPTIONS: { value: GoalPeriodType; label: string }[] = [
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'all_time',   label: 'All Time' },
  { value: 'custom',     label: 'Custom Range' },
]

interface GoalFormProps {
  onClose: () => void
  onSave: (data: Omit<DbGoal, 'id' | 'user_id' | 'account_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>
}

export default function GoalForm({ onClose, onSave }: GoalFormProps) {
  const [selectedType, setSelectedType] = useState<GoalType>('profit_target')
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState<GoalPeriodType>('this_year')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const meta = GOAL_TYPES.find(t => t.type === selectedType)!

  function handleTypeSelect(type: GoalType) {
    const m = GOAL_TYPES.find(t => t.type === type)!
    setSelectedType(type)
    setPeriod(m.defaultPeriod)
    setTitle(m.defaultTitle)
    setTargetValue('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const numTarget = parseFloat(targetValue)
    if (!targetValue || isNaN(numTarget) || numTarget <= 0) {
      setError('Please enter a valid target value.')
      return
    }
    if (meta.max !== undefined && numTarget > meta.max) {
      setError(`Target must be ≤ ${meta.max}${meta.unit}.`)
      return
    }
    if (period === 'custom' && (!customStart || !customEnd)) {
      setError('Please select start and end dates.')
      return
    }
    if (period === 'custom' && customStart >= customEnd) {
      setError('Start date must be before end date.')
      return
    }

    const { start, end } = getPeriodDates(period, customStart, customEnd)

    setSaving(true)
    try {
      await onSave({
        title: title.trim() || meta.defaultTitle,
        type: selectedType,
        period,
        period_start: start,
        period_end: end,
        target_value: numTarget,
      })
      onClose()
    } catch {
      setError('Failed to save goal. Please try again.')
      setSaving(false)
    }
  }

  const selectedPeriodDates = period !== 'custom'
    ? getPeriodDates(period)
    : customStart && customEnd
      ? { start: customStart, end: customEnd }
      : null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-base border border-border rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-text-primary font-semibold text-base">New Goal</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Goal type selector */}
          <div>
            <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-2.5">
              Goal Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_TYPES.map(({ type, icon: Icon, label, description }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                    selectedType === type
                      ? 'bg-accent/10 border-accent/40 text-text-primary'
                      : 'bg-surface border-border text-text-muted hover:border-border/80 hover:text-text-primary hover:bg-hover'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${selectedType === type ? 'text-accent' : 'text-text-dim'}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-none">{label}</div>
                    <div className="text-xs text-text-dim mt-1 leading-snug truncate">{description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={meta.defaultTitle}
              maxLength={80}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Period */}
          <div>
            <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">
              Period
            </label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    period === opt.value
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-surface border-border text-text-muted hover:text-text-primary hover:bg-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex gap-3 mt-3">
                <div className="flex-1">
                  <label className="block text-text-dim text-xs mb-1">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-text-dim text-xs mb-1">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              </div>
            )}
            {selectedPeriodDates && period !== 'custom' && (
              <p className="text-text-dim text-xs mt-1.5">
                {selectedPeriodDates.start} → {selectedPeriodDates.end}
              </p>
            )}
          </div>

          {/* Target value */}
          <div>
            <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">
              Target {meta.unit !== '$' && `(${meta.unit})`}
            </label>
            <div className="relative">
              {meta.unit === '$' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
              )}
              <input
                type="number"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder={meta.placeholder}
                min={meta.min ?? 0}
                max={meta.max}
                step="any"
                required
                className={`w-full bg-surface border border-border rounded-lg py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors ${meta.unit === '$' ? 'pl-7 pr-3' : 'px-3'}`}
              />
              {meta.unit !== '$' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">{meta.unit}</span>
              )}
            </div>
            {selectedType === 'max_drawdown' && (
              <p className="text-text-dim text-xs mt-1.5">
                Goal is to keep max drawdown below this amount for the entire period.
              </p>
            )}
            {selectedType === 'win_rate' && (
              <p className="text-text-dim text-xs mt-1.5">
                Requires at least 10 trades to count as achieved.
              </p>
            )}
          </div>

          {error && (
            <p className="text-loss text-sm bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-hover text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
