import { useState, useEffect } from 'react'
import { Upload, GripVertical, LayoutGrid, Check, ArrowUp, ArrowDown, EyeOff } from 'lucide-react'
import type { DbGoal } from '../types'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDateRange, computeStats, computeDailyPnl, computeCumulativePnl, computeWeeklyStats, formatLocalDate } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import type { DbTrade, DateRange } from '../types'
import GoalsWidget from '../components/dashboard/GoalsWidget'
import DateFilter from '../components/dashboard/DateFilter'
import StatsCards from '../components/dashboard/StatsCards'
import { EquityCurve, DailyBars } from '../components/dashboard/PnlChart'
import RecentTrades from '../components/dashboard/RecentTrades'
import WeeklyStatsTable from '../components/dashboard/WeeklyStats'
import TradeCalendar from '../components/calendar/TradeCalendar'
import ForecastWidget from '../components/dashboard/ForecastWidget'
import StreakWidget from '../components/dashboard/StreakWidget'
import CoachingBanner from '../components/coaching/CoachingBanner'
import { useCoachingSettings } from '../hooks/useCoachingSettings'
import { useCoachingCues } from '../hooks/useCoachingCues'

type SectionId = 'coaching' | 'streak' | 'stats' | 'charts' | 'recent' | 'calendar' | 'weekly' | 'goals' | 'forecast'

const SECTION_META: Record<SectionId, { label: string; subtitle: string }> = {
  coaching: { label: 'Coaching',           subtitle: "Risk-management nudges based on today's trading" },
  streak:   { label: 'Streak',             subtitle: 'Consecutive profitable trading days' },
  stats:    { label: 'Performance Stats',  subtitle: 'Key metrics for the selected period' },
  charts:   { label: 'Charts',             subtitle: 'Equity curve & daily P&L' },
  recent:   { label: 'Recent Trades',      subtitle: 'Latest trades in selected period' },
  calendar: { label: 'Calendar',           subtitle: 'Click a day to see its trades' },
  weekly:   { label: 'Weekly Breakdown',   subtitle: 'Last 13 weeks' },
  goals:    { label: 'Goals',              subtitle: 'Progress toward your trading targets' },
  forecast: { label: 'Forecast',           subtitle: 'Projected period-end P&L based on your avg daily' },
}

type WidgetWidth = 'half' | 'full'
type DashboardWidget = { id: SectionId; width: WidgetWidth; visible: boolean }
const DEFAULT_ORDER: SectionId[] = ['stats', 'charts', 'coaching', 'streak', 'goals', 'forecast', 'weekly', 'recent', 'calendar']
const DEFAULT_WIDGETS: DashboardWidget[] = DEFAULT_ORDER.map(id => ({
  id, width: ['coaching', 'streak', 'goals', 'forecast'].includes(id) ? 'half' : 'full', visible: true,
}))
const LAYOUT_STORAGE_KEY = 'ttt_dashboard_widgets_v2'

function loadWidgets(): DashboardWidget[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null')
    if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGETS.length &&
      new Set(parsed.map(w => w?.id)).size === DEFAULT_WIDGETS.length &&
      parsed.every(w => w && DEFAULT_ORDER.includes(w.id) &&
        ['half', 'full'].includes(w.width) && typeof w.visible === 'boolean')) return parsed
    // Keep the order and widths of layouts saved with the previous grid editor.
    const legacy: unknown = JSON.parse(localStorage.getItem('ttt_dashboard_layout') ?? 'null')
    if (Array.isArray(legacy) && legacy.length === DEFAULT_WIDGETS.length &&
      new Set(legacy.map(w => w?.i)).size === DEFAULT_WIDGETS.length &&
      legacy.every(w => w && DEFAULT_ORDER.includes(w.i) &&
        [w.x, w.y, w.w].every(Number.isFinite))) {
      return [...legacy].sort((a, b) => a.y - b.y || a.x - b.x).map(w => ({
        id: w.i, width: w.w <= 2 ? 'half' : 'full', visible: true,
      }))
    }
  } catch { /* Use defaults if storage is unavailable or invalid. */ }
  return DEFAULT_WIDGETS
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_week'))
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [allTrades, setAllTrades] = useState<DbTrade[]>([])
  const [goals, setGoals] = useState<DbGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [allLoading, setAllLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets)
  const [draggedId, setDraggedId] = useState<SectionId | null>(null)
  const [dropId, setDropId] = useState<SectionId | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [editMode, setEditMode] = useState(false)

  const { settings: coachingSettings, updateSettings: updateCoachingSettings } = useCoachingSettings(user?.id ?? null)
  const { cues: coachingCues, dismiss: dismissCoachingCue } = useCoachingCues(allTrades, activeAccount, coachingSettings)

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

  useEffect(() => {
    if (!user || !activeAccount) return
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', activeAccount.id)
      .order('exit_time', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setAllTrades(data ?? [])
        setAllLoading(false)
      })
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', activeAccount.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setGoals((data ?? []) as DbGoal[])
        setGoalsLoading(false)
      })
  }, [user, activeAccount])

  const stats = computeStats(trades)
  const dailyPnl = computeDailyPnl(trades)
  const cumulativePnl = computeCumulativePnl(trades)
  const allDailyPnl = computeDailyPnl(allTrades)
  const weeklyStats = computeWeeklyStats(allTrades)
  const sortedByTime = [...trades].sort(
    (a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime()
  )
  const hasAnyTrades = allTrades.length > 0

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(widgets))
      setSaveError(false)
    } catch { setSaveError(true) }
  }, [widgets])

  function updateWidget(id: SectionId, update: Partial<DashboardWidget>) {
    setWidgets(previous => previous.map(widget => widget.id === id ? { ...widget, ...update } : widget))
  }

  function moveWidget(id: SectionId, targetId: SectionId) {
    if (id === targetId) return
    setWidgets(previous => {
      const next = [...previous]
      const source = next.findIndex(w => w.id === id)
      const target = next.findIndex(w => w.id === targetId)
      const [widget] = next.splice(source, 1)
      next.splice(target, 0, widget)
      return next
    })
    setAnnouncement(`${SECTION_META[id].label} moved`)
  }

  const visibleWidgets = widgets.filter(widget => widget.visible)

  function renderContent(id: SectionId) {
    switch (id) {
      case 'coaching':
        return (
          <CoachingBanner
            cues={coachingCues}
            onDismiss={dismissCoachingCue}
            settings={coachingSettings}
            onUpdateSettings={updateCoachingSettings}
          />
        )
      case 'streak':
        return <StreakWidget trades={allTrades} loading={allLoading} />
      case 'stats':
        return <StatsCards stats={stats} loading={loading} />
      case 'charts':
        return (
          <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
            <EquityCurve data={cumulativePnl} loading={loading} />
            <DailyBars data={dailyPnl} loading={loading} />
          </div>
        )
      case 'recent':
        return <RecentTrades trades={sortedByTime} loading={loading} />
      case 'calendar':
        return <TradeCalendar dailyPnl={allDailyPnl} trades={allTrades} loading={allLoading} />
      case 'weekly':
        return <WeeklyStatsTable data={weeklyStats} loading={allLoading} />
      case 'goals':
        return <GoalsWidget goals={goals} allTrades={allTrades} loading={goalsLoading || allLoading} />
      case 'forecast':
        return <ForecastWidget allTrades={allTrades} loading={allLoading} />
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Dashboard</h1>
          {editMode && (
            <p className="text-text-muted text-sm mt-0.5">
              Drag widgets to reposition, or pick a size — changes save automatically
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {editMode && (
            <button
              onClick={() => { setWidgets(DEFAULT_WIDGETS); setAnnouncement('Default layout restored') }}
              className="text-text-dim hover:text-text-muted text-xs font-medium transition-colors"
            >
              Reset layout
            </button>
          )}
          <DateFilter value={dateRange} onChange={setDateRange} />
          <button
              onClick={() => { setEditMode(v => !v); setDraggedId(null); setDropId(null) }}
              aria-pressed={editMode}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                editMode
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-hover text-text-muted hover:text-text-primary'
              }`}
            >
              {editMode ? <Check className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              {editMode ? 'Done' : 'Customize'}
            </button>
          <Link
            to="/import"
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white rounded-lg px-3.5 py-2 text-sm font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {!allLoading && !hasAnyTrades && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">No trades yet</h3>
          <p className="text-text-muted text-sm mb-4 max-w-xs">
            Import your TradingView order history CSV to see your trading performance.
          </p>
          <Link
            to="/import"
            className="bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
          >
            Import trades
          </Link>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      {editMode && (
        <div className="bg-surface border border-accent/30 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">Your dashboard, your way</p>
            <p className="text-xs text-text-muted" role="status">
              {saveError ? 'Changes apply now, but could not be saved in this browser.' : 'Layout saves automatically in this browser.'}
            </p>
          </div>
          <p className="text-xs text-text-muted">Choose visible widgets below. Half-width widgets expand to full width on smaller screens.</p>
          <div className="flex flex-wrap gap-2">
            {widgets.map(widget => (
              <label key={widget.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${widget.visible ? 'border-accent/30 bg-accent/10 text-text-primary' : 'border-border text-text-muted'}`}>
                <input type="checkbox" checked={widget.visible} onChange={event => updateWidget(widget.id, { visible: event.target.checked })} className="accent-accent" />
                {SECTION_META[widget.id].label}
              </label>
            ))}
          </div>
        </div>
      )}
      {visibleWidgets.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
          All widgets are hidden. <button onClick={() => setEditMode(true)} className="text-accent hover:underline">Choose widgets</button> to build your dashboard.
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {visibleWidgets.map((widget, index) => {
          const { id } = widget
          const { label, subtitle } = SECTION_META[id]
          return (
            <section
              key={id}
              aria-labelledby={`widget-${id}`}
              onDragOver={event => {
                if (!editMode || !draggedId || draggedId === id) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDropId(id)
              }}
              onDrop={event => {
                event.preventDefault()
                if (editMode && draggedId) moveWidget(draggedId, id)
                setDraggedId(null)
                setDropId(null)
              }}
              className={`@container min-w-0 space-y-3 rounded-xl ${widget.width === 'full' ? 'xl:col-span-2' : ''} ${editMode ? 'p-3 border border-dashed border-accent/30 bg-surface/30' : ''} ${dropId === id ? 'ring-2 ring-accent' : ''} ${draggedId === id ? 'opacity-50' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {editMode && (
                    <button
                      draggable
                      onDragStart={event => {
                        event.dataTransfer.setData('text/plain', id)
                        event.dataTransfer.effectAllowed = 'move'
                        setDraggedId(id)
                      }}
                      onDragEnd={() => { setDraggedId(null); setDropId(null) }}
                      title={`Drag to reposition ${label}`}
                      aria-label={`Drag to reposition ${label}; alternatively use the move buttons`}
                      className="p-1.5 rounded-md text-text-muted hover:bg-hover cursor-grab active:cursor-grabbing"
                    ><GripVertical className="w-4 h-4" /></button>
                  )}
                  <div className="min-w-0">
                    <h2 id={`widget-${id}`} className="text-text-primary font-semibold text-sm">{label}</h2>
                    <p className="text-text-dim text-xs mt-0.5">{subtitle}</p>
                  </div>
                </div>
                {editMode && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button disabled={index === 0} onClick={() => moveWidget(id, visibleWidgets[index - 1].id)} aria-label={`Move ${label} earlier`} title="Move earlier" className="p-2 rounded-md text-text-muted hover:bg-hover disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                    <button disabled={index === visibleWidgets.length - 1} onClick={() => moveWidget(id, visibleWidgets[index + 1].id)} aria-label={`Move ${label} later`} title="Move later" className="p-2 rounded-md text-text-muted hover:bg-hover disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                    <select aria-label={`${label} width`} value={widget.width} onChange={event => updateWidget(id, { width: event.target.value as WidgetWidth })} className="bg-deep border border-border rounded-md px-2 py-1.5 text-xs text-text-muted">
                      <option value="half">Half width</option>
                      <option value="full">Full width</option>
                    </select>
                    <button onClick={() => updateWidget(id, { visible: false })} aria-label={`Hide ${label}`} title={`Hide ${label}`} className="p-2 rounded-md text-text-muted hover:bg-hover"><EyeOff className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="min-w-0">{renderContent(id)}</div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
