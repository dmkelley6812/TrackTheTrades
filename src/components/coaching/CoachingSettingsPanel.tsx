import { useEffect, useRef, useState } from 'react'
import type { DbCoachingSettings } from '../../types'

interface Props {
  settings: DbCoachingSettings
  onUpdate: (partial: Partial<DbCoachingSettings>) => void
  onClose: () => void
}

interface Row {
  label: string
  description: string
  enabledKey: keyof DbCoachingSettings
  thresholdKey: keyof DbCoachingSettings
  thresholdLabel: string
  thresholdSuffix: string
}

const ROWS: Row[] = [
  {
    label: 'Large single loss',
    description: 'Flag when one trade loses more than this % of your account',
    enabledKey: 'large_loss_enabled',
    thresholdKey: 'large_loss_pct',
    thresholdLabel: 'Threshold',
    thresholdSuffix: '%',
  },
  {
    label: 'Losing streak',
    description: 'Flag after this many losing trades in a row today',
    enabledKey: 'loss_streak_enabled',
    thresholdKey: 'loss_streak_count',
    thresholdLabel: 'Trades',
    thresholdSuffix: '',
  },
  {
    label: 'Daily loss limit',
    description: "Flag when today's total loss exceeds this % of your account",
    enabledKey: 'daily_loss_enabled',
    thresholdKey: 'daily_loss_pct',
    thresholdLabel: 'Threshold',
    thresholdSuffix: '%',
  },
]

export default function CoachingSettingsPanel({ settings, onUpdate, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [draftThresholds, setDraftThresholds] = useState<Record<string, string>>({})

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function thresholdValue(row: Row): string {
    if (draftThresholds[row.thresholdKey] !== undefined) return draftThresholds[row.thresholdKey]
    return String(settings[row.thresholdKey])
  }

  function commitThreshold(row: Row) {
    const raw = draftThresholds[row.thresholdKey]
    if (raw === undefined) return
    const num = Number(raw)
    if (!isNaN(num) && num > 0) onUpdate({ [row.thresholdKey]: num })
    setDraftThresholds(prev => {
      const next = { ...prev }
      delete next[row.thresholdKey]
      return next
    })
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 w-72 bg-base border border-border rounded-xl shadow-2xl z-30 p-4 space-y-4"
    >
      <p className="text-text-primary text-sm font-semibold">Coaching settings</p>
      {ROWS.map(row => {
        const enabled = Boolean(settings[row.enabledKey])
        return (
          <div key={row.label} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-text-primary text-xs font-medium">{row.label}</p>
                <p className="text-text-dim text-[11px] leading-snug mt-0.5">{row.description}</p>
              </div>
              <button
                onClick={() => onUpdate({ [row.enabledKey]: !enabled })}
                className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                  enabled ? 'bg-accent' : 'bg-hover'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {enabled && (
              <div className="flex items-center gap-2">
                <span className="text-text-dim text-[11px]">{row.thresholdLabel}</span>
                <input
                  type="number"
                  min={1}
                  value={thresholdValue(row)}
                  onChange={e =>
                    setDraftThresholds(prev => ({ ...prev, [row.thresholdKey]: e.target.value }))
                  }
                  onBlur={() => commitThreshold(row)}
                  className="w-16 bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary tabular-nums focus:outline-none focus:border-accent/50"
                />
                <span className="text-text-dim text-[11px]">{row.thresholdSuffix}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
