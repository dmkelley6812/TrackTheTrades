import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays } from 'date-fns'
import type { DbTrade } from '../../types'
import { formatCurrency, formatLocalDate } from '../../lib/utils'
import { countTradingDays } from '../../lib/trading-holidays'

type ForecastPeriod = 'week' | 'month' | 'year'

const PERIOD_LABELS: Record<ForecastPeriod, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
}

interface ForecastWidgetProps {
  allTrades: DbTrade[]
  loading: boolean
}

function getPeriodBounds(period: ForecastPeriod): { start: Date; end: Date } {
  const now = new Date()
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) }
  }
}

export default function ForecastWidget({ allTrades, loading }: ForecastWidgetProps) {
  const [period, setPeriod] = useState<ForecastPeriod>('month')

  const forecast = useMemo(() => {
    const { start, end } = getPeriodBounds(period)
    const startStr = formatLocalDate(start)
    const endStr = formatLocalDate(end)
    const todayStr = formatLocalDate(new Date())
    const tomorrowStr = formatLocalDate(addDays(new Date(), 1))

    const periodTrades = allTrades.filter(
      t => t.trade_date >= startStr && t.trade_date <= endStr
    )
    if (periodTrades.length === 0) return null

    const currentPnl = periodTrades.reduce((s, t) => s + t.net_pnl, 0)
    const daysTraded = new Set(periodTrades.map(t => t.trade_date)).size
    const avgDailyPnl = daysTraded > 0 ? currentPnl / daysTraded : 0

    // Remaining trading days start from tomorrow (today's P&L is already captured)
    const remainingTradingDays =
      tomorrowStr <= endStr ? countTradingDays(tomorrowStr, endStr) : 0

    const projectedAdditional = avgDailyPnl * remainingTradingDays
    const forecastTotal = currentPnl + projectedAdditional
    const totalTradingDays = countTradingDays(startStr, endStr)
    const elapsedTradingDays =
      todayStr <= endStr ? countTradingDays(startStr, todayStr) : totalTradingDays

    return {
      currentPnl,
      daysTraded,
      avgDailyPnl,
      remainingTradingDays,
      projectedAdditional,
      forecastTotal,
      totalTradingDays,
      elapsedTradingDays,
    }
  }, [allTrades, period])

  const pnlClass = (v: number) =>
    v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-text-muted'

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Header + period tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="text-text-primary font-semibold text-sm leading-none">Forecast</div>
            <div className="text-text-dim text-xs mt-0.5">Projected period-end P&amp;L</div>
          </div>
        </div>
        <div className="flex items-center bg-deep rounded-lg p-0.5 gap-0.5">
          {(['week', 'month', 'year'] as ForecastPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-8 bg-deep rounded-lg animate-pulse w-36" />
          <div className="h-3 bg-deep rounded animate-pulse w-56" />
          <div className="h-1.5 bg-deep rounded-full animate-pulse mt-3" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-deep rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* No trades in period */}
      {!loading && !forecast && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TrendingUp className="w-8 h-8 text-text-dim mb-2" />
          <p className="text-text-muted text-sm">No trades in {PERIOD_LABELS[period].toLowerCase()}</p>
          <p className="text-text-dim text-xs mt-1">Import trades to see your forecast</p>
        </div>
      )}

      {/* Forecast content */}
      {!loading && forecast && (
        <>
          {/* Primary forecast number */}
          <div className="mb-4">
            <div className="text-text-dim text-[10px] uppercase tracking-wide font-medium mb-1">
              Projected {PERIOD_LABELS[period]} Total
            </div>
            <div className={`text-2xl font-bold tabular-nums ${pnlClass(forecast.forecastTotal)}`}>
              {formatCurrency(forecast.forecastTotal)}
            </div>
            <div className="text-text-dim text-xs mt-0.5">
              {forecast.remainingTradingDays > 0
                ? `${formatCurrency(forecast.currentPnl)} actual + ${formatCurrency(forecast.projectedAdditional)} projected`
                : 'Period complete — no remaining trading days'}
            </div>
          </div>

          {/* Period progress bar */}
          {forecast.totalTradingDays > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-text-dim mb-1">
                <span>{forecast.elapsedTradingDays} of {forecast.totalTradingDays} trading days elapsed</span>
                <span>{forecast.remainingTradingDays} remaining</span>
              </div>
              <div className="h-1.5 rounded-full bg-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (forecast.elapsedTradingDays / forecast.totalTradingDays) * 100)}%`,
                    background: 'linear-gradient(90deg, #4a7cf4, #7c3aed)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Stat grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-deep rounded-lg p-3">
              <div className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Current P&amp;L</div>
              <div className={`text-sm font-bold tabular-nums ${pnlClass(forecast.currentPnl)}`}>
                {formatCurrency(forecast.currentPnl)}
              </div>
            </div>
            <div className="bg-deep rounded-lg p-3">
              <div className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Avg / Day</div>
              <div className={`text-sm font-bold tabular-nums ${pnlClass(forecast.avgDailyPnl)}`}>
                {formatCurrency(forecast.avgDailyPnl)}
              </div>
              <div className="text-text-dim text-[10px] mt-0.5">
                {forecast.daysTraded} day{forecast.daysTraded !== 1 ? 's' : ''} traded
              </div>
            </div>
            <div className="bg-deep rounded-lg p-3">
              <div className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Projected Add.</div>
              {forecast.remainingTradingDays > 0 ? (
                <>
                  <div className={`text-sm font-bold tabular-nums ${pnlClass(forecast.projectedAdditional)}`}>
                    {formatCurrency(forecast.projectedAdditional)}
                  </div>
                  <div className="text-text-dim text-[10px] mt-0.5">
                    {forecast.remainingTradingDays} day{forecast.remainingTradingDays !== 1 ? 's' : ''} left
                  </div>
                </>
              ) : (
                <div className="text-text-muted text-sm font-bold">—</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
