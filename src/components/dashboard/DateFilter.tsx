import { useState } from 'react'
import { ChevronDown, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { DatePreset, DateRange } from '../../types'
import { getDateRange, formatDateRangeLabel } from '../../lib/utils'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Custom', value: 'custom' },
]

export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(format(value.start, 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(value.end, 'yyyy-MM-dd'))

  function selectPreset(preset: DatePreset) {
    if (preset === 'custom') return // handled separately
    onChange(getDateRange(preset))
    setOpen(false)
  }

  function applyCustom() {
    const start = new Date(customStart)
    const end = new Date(customEnd + 'T23:59:59')
    onChange(getDateRange('custom', start, end))
    setOpen(false)
  }

  const label =
    value.preset === 'custom'
      ? formatDateRangeLabel(value)
      : PRESETS.find(p => p.value === value.preset)?.label ?? 'Select range'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-surface border border-border hover:border-border-bright rounded-lg px-3.5 py-2 text-sm text-text-primary transition-all"
      >
        <Calendar className="w-4 h-4 text-text-muted" />
        <span className="font-medium">{label}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-surface border border-border rounded-xl shadow-card w-64 py-1.5 overflow-hidden">
            {PRESETS.filter(p => p.value !== 'custom').map(preset => (
              <button
                key={preset.value}
                onClick={() => selectPreset(preset.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value.preset === preset.value
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:bg-hover hover:text-text-primary'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-2 px-4 pb-3">
              <p className="text-text-dim text-xs mb-2 font-medium uppercase tracking-wider">Custom Range</p>
              <div className="space-y-1.5 mb-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full bg-base border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-all"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full bg-base border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-all"
                />
              </div>
              <button
                onClick={applyCustom}
                className="w-full bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-md py-1.5 transition-colors font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
