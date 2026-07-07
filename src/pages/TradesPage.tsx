import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { useBadges } from '../hooks/useBadges'
import { getDateRange, computeStats, formatLocalDate } from '../lib/utils'
import type { DbTrade, DateRange, BadgeDefinition } from '../types'
import DateFilter from '../components/dashboard/DateFilter'
import TradesTable from '../components/trades/TradesTable'
import TradeForm from '../components/trades/TradeForm'
import BadgeUnlockModal from '../components/badges/BadgeUnlockModal'
import { formatCurrency, formatPercent } from '../lib/utils'

export default function TradesPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_month'))
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [unlockQueue, setUnlockQueue] = useState<BadgeDefinition[]>([])
  const { checkAndAward, revokeStale } = useBadges(user?.id ?? null, activeAccount?.id ?? null)

  useEffect(() => {
    if (!user || !activeAccount) return
    setLoading(true)
    const start = formatLocalDate(dateRange.start)
    const end = formatLocalDate(dateRange.end)
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', activeAccount.id)
      .gte('trade_date', start)
      .lte('trade_date', end)
      .order('exit_time', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTrades(data ?? [])
        setLoading(false)
      })
  }, [user, activeAccount, dateRange])

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
        .eq('account_id', activeAccount!.id)
    }

    setTrades(prev => prev.filter(t => !ids.includes(t.id)))
    toast.success(`Deleted ${ids.length} trade${ids.length !== 1 ? 's' : ''}`)

    const { data: remainingTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user!.id)
      .eq('account_id', activeAccount!.id)
    await revokeStale((remainingTrades ?? []) as DbTrade[])
  }, [user, activeAccount, trades, revokeStale])

  const handleCreate = useCallback(async (
    data: Omit<DbTrade, 'id' | 'user_id' | 'account_id' | 'created_at' | 'import_id'>
  ) => {
    const { data: inserted, error } = await supabase
      .from('trades')
      .insert({ ...data, user_id: user!.id, account_id: activeAccount!.id, import_id: null })
      .select()
      .single()
    if (error) {
      toast.error('Failed to save trade')
      throw error
    }
    const trade = inserted as DbTrade
    const start = formatLocalDate(dateRange.start)
    const end = formatLocalDate(dateRange.end)
    if (trade.trade_date >= start && trade.trade_date <= end) {
      setTrades(prev => [trade, ...prev])
    }
    toast.success('Trade added')

    const { data: allTradesData } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user!.id)
      .eq('account_id', activeAccount!.id)
      .order('exit_time', { ascending: true })
    const newBadges = await checkAndAward((allTradesData ?? []) as DbTrade[])
    if (newBadges.length > 0) setUnlockQueue(newBadges)
  }, [user, activeAccount, dateRange, checkAndAward])

  const stats = computeStats(trades)

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Trades</h1>
          <p className="text-text-muted text-sm mt-0.5">Full trade history</p>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Trade
          </button>
        </div>
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

      {showForm && (
        <TradeForm onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}

      {unlockQueue.length > 0 && (
        <BadgeUnlockModal badges={unlockQueue} onClose={() => setUnlockQueue([])} />
      )}
    </div>
  )
}
