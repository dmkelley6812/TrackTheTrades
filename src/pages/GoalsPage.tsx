import { useState, useEffect, useMemo } from 'react'
import { Flag, Plus, Trophy, Target, TrendingUp, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import type { DbGoal, DbTrade, GoalStatus } from '../types'
import { computeGoalProgress } from '../lib/goals'
import GoalCard from '../components/goals/GoalCard'
import GoalForm from '../components/goals/GoalForm'

type FilterTab = 'all' | 'active' | 'achieved' | 'archived'

export default function GoalsPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [goals, setGoals] = useState<DbGoal[]>([])
  const [allTrades, setAllTrades] = useState<DbTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('active')

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !activeAccount) return
    void loadData()
  }, [user, activeAccount])

  async function loadData() {
    setLoading(true)
    try {
      const [goalsRes, tradesRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user!.id)
          .eq('account_id', activeAccount!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user!.id)
          .eq('account_id', activeAccount!.id)
          .order('trade_date', { ascending: true }),
      ])
      if (goalsRes.error) throw goalsRes.error
      if (tradesRes.error) throw tradesRes.error
      setGoals((goalsRes.data ?? []) as DbGoal[])
      setAllTrades((tradesRes.data ?? []) as DbTrade[])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function handleCreate(data: Omit<DbGoal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) {
    const { data: inserted, error } = await supabase
      .from('goals')
      .insert({ ...data, user_id: user!.id, account_id: activeAccount!.id, status: 'active' })
      .select()
      .single()
    if (error) throw error
    setGoals(prev => [inserted as DbGoal, ...prev])
    toast.success('Goal created!')
  }

  async function handleStatusUpdate(id: string, status: GoalStatus) {
    const { error } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) { toast.error('Failed to update goal'); return }
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status } : g))
    if (status === 'achieved') toast.success('Goal marked as achieved!')
    else if (status === 'archived') toast('Goal archived')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal? This cannot be undone.')) return
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) { toast.error('Failed to delete goal'); return }
    setGoals(prev => prev.filter(g => g.id !== id))
    toast('Goal deleted')
  }

  // ── Compute progress for all goals ──────────────────────────────────────────
  const allProgress = useMemo(
    () => goals.map(g => computeGoalProgress(g, allTrades)),
    [goals, allTrades],
  )

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === 'all') return allProgress
    if (filter === 'achieved')
      return allProgress.filter(p => p.goal.status === 'achieved' || p.isAchieved)
    if (filter === 'archived') return allProgress.filter(p => p.goal.status === 'archived')
    return allProgress.filter(p => p.goal.status === 'active')
  }, [allProgress, filter])

  // ── Summary stats ────────────────────────────────────────────────────────────
  const activeProgress = allProgress.filter(p => p.goal.status === 'active')
  const achievedCount = allProgress.filter(p => p.goal.status === 'achieved' || p.isAchieved).length
  const onTrackCount = activeProgress.filter(p => p.projectedDate || p.goal.type === 'max_drawdown' ? !p.isFailed : false).length
  const avgProgress =
    activeProgress.length > 0
      ? activeProgress.reduce((s, p) => s + p.percentComplete, 0) / activeProgress.length
      : 0

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'active',   label: 'Active',   count: goals.filter(g => g.status === 'active').length },
    { key: 'achieved', label: 'Achieved', count: achievedCount },
    { key: 'archived', label: 'Archived', count: goals.filter(g => g.status === 'archived').length },
    { key: 'all',      label: 'All',      count: goals.length },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary font-semibold text-xl">Goals</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Track profit targets, consistency, and performance milestones
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Summary cards */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="text-text-primary font-bold text-lg tabular-nums">{activeProgress.length}</div>
              <div className="text-text-muted text-xs">Active Goals</div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-profit/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-profit" />
            </div>
            <div>
              <div className="text-profit font-bold text-lg tabular-nums">{achievedCount}</div>
              <div className="text-text-muted text-xs">Achieved</div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="text-text-primary font-bold text-lg tabular-nums">
                {avgProgress.toFixed(0)}%
              </div>
              <div className="text-text-muted text-xs">Avg Progress</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? 'bg-accent/20 text-accent' : 'bg-deep text-text-dim'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Goals grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(progress => (
            <GoalCard
              key={progress.goal.id}
              progress={progress}
              onArchive={id => handleStatusUpdate(id, 'archived')}
              onMarkAchieved={id => handleStatusUpdate(id, 'achieved')}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : goals.length === 0 ? (
        /* Empty state — no goals at all */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
            <Flag className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-text-primary font-semibold text-base mb-2">Set your first trading goal</h3>
          <p className="text-text-muted text-sm max-w-sm mb-6 leading-relaxed">
            Track profit targets, win rates, consistency streaks, and more. Goals help you stay accountable
            and measure what matters.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Create a Goal
          </button>

          {/* Suggested goals */}
          <div className="mt-10 text-left w-full max-w-md">
            <p className="text-text-dim text-xs font-medium uppercase tracking-wider mb-3 text-center">
              Popular goals
            </p>
            <div className="space-y-2">
              {[
                { label: 'Annual profit target', description: 'Set a P&L goal for the year' },
                { label: '70% win rate this month', description: 'Track your win percentage' },
                { label: '200 profitable trading days', description: 'Build consistent daily habits' },
                { label: 'Keep drawdown below $5,000', description: 'Protect your capital' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-surface border border-border rounded-xl text-left hover:border-accent/30 hover:bg-hover transition-all group"
                >
                  <CheckCircle className="w-4 h-4 text-text-dim group-hover:text-accent flex-shrink-0 transition-colors" />
                  <div>
                    <div className="text-text-muted text-sm font-medium group-hover:text-text-primary transition-colors">{s.label}</div>
                    <div className="text-text-dim text-xs">{s.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty filtered state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-muted text-sm">No {filter} goals.</p>
          {filter !== 'active' && (
            <button
              onClick={() => setFilter('active')}
              className="mt-2 text-accent text-sm hover:underline"
            >
              View active goals
            </button>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <GoalForm
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
