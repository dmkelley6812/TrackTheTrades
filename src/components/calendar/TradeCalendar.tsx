import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyPnl, DbTrade } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  dailyPnl: DailyPnl[]
  trades: DbTrade[]
  loading: boolean
}

function getDayIntensity(pnl: number, maxAbs: number): string {
  if (maxAbs === 0 || pnl === 0) return ''
  const ratio = Math.min(Math.abs(pnl) / maxAbs, 1)
  if (pnl > 0) {
    if (ratio > 0.66) return 'bg-profit/30 border-profit/40'
    if (ratio > 0.33) return 'bg-profit/15 border-profit/25'
    return 'bg-profit/8 border-profit/15'
  } else {
    if (ratio > 0.66) return 'bg-loss/30 border-loss/40'
    if (ratio > 0.33) return 'bg-loss/15 border-loss/25'
    return 'bg-loss/8 border-loss/15'
  }
}

export default function TradeCalendar({ dailyPnl, trades, loading }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const pnlMap = new Map<string, DailyPnl>()
  for (const d of dailyPnl) pnlMap.set(d.date, d)

  const maxAbs = Math.max(...dailyPnl.map(d => Math.abs(d.netPnl)), 0)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const selectedDayTrades = selectedDay
    ? trades.filter(t => t.trade_date === selectedDay)
        .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime())
    : []

  const selectedDayPnl = selectedDay ? pnlMap.get(selectedDay) : null

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-bold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-lg bg-surface border border-border hover:border-border-bright flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 h-8 rounded-lg bg-surface border border-border hover:border-border-bright text-text-muted hover:text-text-primary text-xs font-medium transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-lg bg-surface border border-border hover:border-border-bright flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekdays.map(wd => (
            <div key={wd} className="py-2.5 text-center text-text-dim text-xs font-medium uppercase tracking-wider">
              {wd}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {loading
            ? Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 border-b border-r border-border/30 p-2">
                  <div className="h-3 bg-hover rounded animate-pulse w-4" />
                </div>
              ))
            : days.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const pnl = pnlMap.get(dateStr)
                const inMonth = isSameMonth(day, currentMonth)
                const selected = selectedDay === dateStr
                const today = isToday(day)
                const intensity = pnl ? getDayIntensity(pnl.netPnl, maxAbs) : ''

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (pnl) setSelectedDay(selected ? null : dateStr)
                    }}
                    className={`
                      h-20 border-b border-r border-border/30 p-2 flex flex-col
                      ${inMonth ? '' : 'opacity-30'}
                      ${pnl ? 'cursor-pointer' : ''}
                      ${selected ? 'ring-1 ring-inset ring-accent' : ''}
                      ${intensity}
                      ${pnl && !selected ? 'hover:brightness-110' : ''}
                      transition-all
                    `}
                  >
                    <div className={`text-xs font-medium mb-auto ${today ? 'text-accent' : 'text-text-muted'}`}>
                      {format(day, 'd')}
                      {today && <span className="ml-1 text-accent">•</span>}
                    </div>
                    {pnl && (
                      <>
                        <div className={`font-mono text-xs font-semibold ${pnl.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(pnl.netPnl, true)}
                        </div>
                        <div className="text-text-dim text-[10px]">{pnl.tradeCount} trade{pnl.tradeCount !== 1 ? 's' : ''}</div>
                      </>
                    )}
                  </div>
                )
              })}
        </div>
      </div>

      {/* Selected day details */}
      {selectedDay && selectedDayPnl && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-text-primary font-semibold text-sm">
              {format(new Date(selectedDay + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className={`font-mono font-bold ${selectedDayPnl.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(selectedDayPnl.netPnl)}
              </span>
              <span className="text-text-dim">{selectedDayPnl.tradeCount} trades</span>
              <button onClick={() => setSelectedDay(null)} className="text-text-dim hover:text-text-muted ml-2">✕</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Dir', 'Symbol', 'Qty', 'Entry', 'Exit', 'Net P&L'].map(h => (
                    <th key={h} className="text-left text-text-dim font-medium px-4 py-2 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDayTrades.map(t => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-hover/40">
                    <td className="px-4 py-2">
                      <span className={`font-medium ${t.direction === 'Long' ? 'text-profit' : 'text-loss'}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-text-primary">{t.symbol}</td>
                    <td className="px-4 py-2 font-mono text-text-muted">{t.qty}</td>
                    <td className="px-4 py-2 font-mono text-text-muted">{t.entry_price.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-text-muted">{t.exit_price.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`font-mono font-semibold ${t.net_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatCurrency(t.net_pnl)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
