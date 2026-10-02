import { useState, useEffect, useCallback } from 'react'
import { Upload, GripVertical, LayoutGrid, Check } from 'lucide-react'
import type { DbGoal } from '../types'
import RGL, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
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

// Access WidthProvider off the default export at runtime (not as a named import) —
// Vite's dev-server dependency pre-bundling (esbuild) only synthesizes a `default`
// export for this package since WidthProvider is attached dynamically
// (`module.exports.WidthProvider = ...`), not as a statically analyzable named export.
const GridLayout = RGL.WidthProvider(RGL)

// ─── Section definitions ──────────────────────────────────────────────────────

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

const DEFAULT_ORDER: SectionId[] = ['coaching', 'streak', 'goals', 'forecast', 'stats', 'charts', 'weekly', 'recent', 'calendar']

// ─── Grid layout (react-grid-layout) ──────────────────────────────────────────

type WidgetSize = 'sm' | 'md' | 'lg'

const SIZE_LABEL: Record<WidgetSize, string> = { sm: 'S', md: 'M', lg: 'L' }
const SIZE_W: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 4 }

function sizeFromW(w: number): WidgetSize {
  return w <= 1 ? 'sm' : w <= 2 ? 'md' : 'lg'
}

const COLS = 4
const ROW_HEIGHT = 10
const MARGIN: [number, number] = [16, 16]

// Fixed row-height per widget (content is effectively bounded for all of these —
// capped lists, fixed chart heights, max 3 coaching cues, etc.) — best-effort
// estimates; the GridWidget wrapper below has overflow-y-auto as a safety net.
const WIDGET_H: Record<SectionId, number> = {
  coaching: 12,
  streak:   7,
  goals:    15,
  forecast: 13,
  stats:    10,
  charts:   12,
  weekly:   23,
  recent:   19,
  calendar: 21,
}

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'coaching', x: 0, y: 0,   w: 4, h: WIDGET_H.coaching },
  { i: 'streak',   x: 0, y: 12,  w: 2, h: WIDGET_H.streak },
  { i: 'goals',    x: 2, y: 12,  w: 2, h: WIDGET_H.goals },
  { i: 'forecast', x: 0, y: 27,  w: 4, h: WIDGET_H.forecast },
  { i: 'stats',    x: 0, y: 40,  w: 4, h: WIDGET_H.stats },
  { i: 'charts',   x: 0, y: 50,  w: 4, h: WIDGET_H.charts },
  { i: 'weekly',   x: 0, y: 62,  w: 4, h: WIDGET_H.weekly },
  { i: 'recent',   x: 0, y: 85,  w: 4, h: WIDGET_H.recent },
  { i: 'calendar', x: 0, y: 104, w: 4, h: WIDGET_H.calendar },
]

const LAYOUT_STORAGE_KEY = 'ttt_dashboard_layout'

function loadLayout(): Layout[] {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Layout[]
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_LAYOUT.length &&
        DEFAULT_LAYOUT.every(d => parsed.some(p => p.i === d.i))
      ) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT
}

// ─── Mobile detection ─────────────────────────────────────────────────────────

function useIsDesktop(breakpoint = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isDesktop
}

// ─── Grid widget wrapper ──────────────────────────────────────────────────────

function SizeSelector({ size, onChange }: { size: WidgetSize; onChange: (size: WidgetSize) => void }) {
  return (
    <div className="flex items-center bg-deep rounded-md p-0.5 gap-0.5 flex-shrink-0">
      {(['sm', 'md', 'lg'] as WidgetSize[]).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          title={s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
          className={`w-5 h-5 rounded text-[10px] font-semibold transition-colors ${
            size === s
              ? 'bg-accent text-white'
              : 'text-text-dim hover:text-text-muted hover:bg-hover'
          }`}
        >
          {SIZE_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

function GridWidget({
  id, editMode, size, onSizeChange, children,
}: {
  id: SectionId
  editMode: boolean
  size: WidgetSize
  onSizeChange: (size: WidgetSize) => void
  children: React.ReactNode
}) {
  const { label, subtitle } = SECTION_META[id]

  return (
    <div className={`@container h-full flex flex-col gap-2 rounded-xl ${editMode ? 'ring-1 ring-accent/20' : ''}`}>
      <div className="flex items-center gap-2 select-none h-7 flex-shrink-0 px-0.5">
        {editMode && (
          <button
            className="drag-handle flex items-center justify-center w-6 h-6 rounded-md text-text-dim hover:text-text-muted hover:bg-hover cursor-grab active:cursor-grabbing transition-colors touch-none flex-shrink-0"
            title={`Drag to reposition ${label}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <span className="text-text-primary font-semibold text-sm flex-shrink-0">{label}</span>
        <span className="text-text-dim text-xs flex-1 truncate">{subtitle}</span>
        {editMode && <SizeSelector size={size} onChange={onSizeChange} />}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const isDesktop = useIsDesktop()
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_week'))
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [allTrades, setAllTrades] = useState<DbTrade[]>([])
  const [goals, setGoals] = useState<DbGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [allLoading, setAllLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [layout, setLayout] = useState<Layout[]>(loadLayout)
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

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(prev => {
      const prevKey = JSON.stringify(prev.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
      const nextKey = JSON.stringify(newLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
      if (prevKey === nextKey) return prev
      localStorage.setItem(LAYOUT_STORAGE_KEY, nextKey)
      return newLayout
    })
  }, [])

  const handleSizeChange = useCallback((id: SectionId, size: WidgetSize) => {
    setLayout(prev => {
      const w = SIZE_W[size]
      const next = prev.map(item =>
        item.i === id ? { ...item, w, x: Math.min(item.x, COLS - w) } : item
      )
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    setLayout(DEFAULT_LAYOUT)
  }, [])

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
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Dashboard</h1>
          {editMode && (
            <p className="text-text-muted text-sm mt-0.5">
              Drag widgets to reposition, or pick a size — changes save automatically
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {editMode && (
            <button
              onClick={handleResetLayout}
              className="text-text-dim hover:text-text-muted text-xs font-medium transition-colors"
            >
              Reset layout
            </button>
          )}
          <DateFilter value={dateRange} onChange={setDateRange} />
          {isDesktop && (
            <button
              onClick={() => setEditMode(v => !v)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                editMode
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-hover text-text-muted hover:text-text-primary'
              }`}
            >
              {editMode ? <Check className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              {editMode ? 'Done' : 'Customize'}
            </button>
          )}
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

      {/* Widgets */}
      {(hasAnyTrades || loading) && (
        isDesktop ? (
          <GridLayout
            layout={layout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            containerPadding={[0, 0]}
            onLayoutChange={handleLayoutChange}
            isDraggable={editMode}
            isResizable={false}
            draggableHandle=".drag-handle"
            compactType="vertical"
            useCSSTransforms
          >
            {layout.map(item => (
              <div key={item.i}>
                <GridWidget
                  id={item.i as SectionId}
                  editMode={editMode}
                  size={sizeFromW(item.w)}
                  onSizeChange={size => handleSizeChange(item.i as SectionId, size)}
                >
                  {renderContent(item.i as SectionId)}
                </GridWidget>
              </div>
            ))}
          </GridLayout>
        ) : (
          <div className="space-y-6">
            {DEFAULT_ORDER.map(id => (
              <div key={id} className="@container space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-semibold text-sm">{SECTION_META[id].label}</span>
                  <span className="text-text-dim text-xs">{SECTION_META[id].subtitle}</span>
                </div>
                {renderContent(id)}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
