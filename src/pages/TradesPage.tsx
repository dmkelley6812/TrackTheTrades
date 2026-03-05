import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getDateRange, computeStats, formatLocalDate } from '../lib/utils'
import type { DbTrade, DateRange } from '../types'
import DateFilter from '../components/dashboard/DateFilter'
import TradesTable from '../components/trades/TradesTable'
import { formatCurrency, formatPercent } from '../lib/utils'

export default function TradesPage() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_month'))
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const start = formatLocalDate(dateRange.start)
    const end = formatLocalDate(dateRange.end)
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('trade_date', start)
      .lte('trade_date', end)
      .order('exit_time', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTrades(data ?? [])
        setLoading(false)
      })
  }, [user, dateRange])

  const handleDelete = useCallback(async (ids: string[]) => {
    // Collect the order IDs linked to the trades being deleted
    const tradesToDelete = trades.filter(t => ids.includes(t.id))
    const orderIds = [...new Set([
      ...tradesToDelete.map(t => t.entry_order_id),
      ...tradesToDelete.map(t => t.exit_order_id),
    ])]

    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', ids)
      .eq('user_id', user!.id)
    if (error) {
      toast.error('Failed to delete trades')
      throw error
    }

    // Also remove the underlying orders so re-importing the same file works
    if (orderIds.length > 0) {
      await supabase
        .from('orders')
        .delete()
        .in('order_id', orderIds)
        .eq('user_id', user!.id)
    }

    setTrades(prev => prev.filter(t => !ids.includes(t.id)))
    toast.success(`Deleted ${ids.length} trade${ids.length !== 1 ? 's' : ''}`)
  }, [user, trades])

  const stats = computeStats(trades)

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Trades</h1>
          <p className="text-text-muted text-sm mt-0.5">Full trade history</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Quick stats bar */}
      <div className="flex flex-wrap gap-4 bg-surface border border-border rounded-xl px-5 py-3">
        {[
          { label: 'Net P&L', value: formatCurrency(stats.totalNetPnl), color: stats.totalNetPnl >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Trades', value: stats.totalTrades.toString(), color: 'text-text-primary' },
          { label: 'Win Rate', value: formatPercent(stats.winRate), color: stats.winRate >= 0.5 ? 'text-profit' : 'text-loss' },
          { label: 'Avg Win', value: formatCurrency(stats.avgWin), color: 'text-profit' },
          { label: 'Avg Loss', value: formatCurrency(-Math.abs(stats.avgLoss)), color: 'text-loss' },
          { label: 'Profit Factor', value: isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞', color: stats.profitFactor >= 1 ? 'text-accent' : 'text-loss' },
          { label: 'Commission', value: formatCurrency(stats.totalCommission), color: 'text-text-muted' },
        ].map(s => (
          <div key={s.label} className="flex flex-col gap-0.5 pr-4 border-r border-border last:border-0 last:pr-0">
            <span className="text-text-dim text-[10px] uppercase tracking-wider">{s.label}</span>
            <span className={`font-mono text-sm font-semibold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <TradesTable trades={trades} loading={loading} onDelete={handleDelete} />
    </div>
  )
}
