import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, GripVertical, LayoutGrid, Check, EyeOff } from 'lucide-react'
import RGL, { type Layout, type Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { createDashboardLayout, loadDashboardLayout, mergeVisibleLayouts, GRID_COLS, GRID_BREAKPOINTS, GRID_STORAGE_KEY } from '../lib/dashboard-layout'
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

// Pixel minima protect legibility; heights are measured from live content.
const MIN_WIDGET_WIDTH: Record<SectionId, number> = {
  coaching: 300, streak: 250, stats: 300, charts: 340,
  goals: 460, forecast: 360, recent: 700, weekly: 760, calendar: 560,
}

// The installed v1 package attaches Responsive to its CommonJS default export.
const ResponsiveGrid = RGL.Responsive

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
  const [dashboardLayout, setDashboardLayout] = useState(loadDashboardLayout)
  const [breakpoint, setBreakpoint] = useState('lg')
  const [gridVersion, setGridVersion] = useState(0)
  const gridContainer = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({})
  const [contentWidths, setContentWidths] = useState<Record<string, number>>({})
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
    const container = gridContainer.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width
      setGridWidth(width)
      setBreakpoint(width > GRID_BREAKPOINTS.lg ? 'lg' : width > GRID_BREAKPOINTS.md ? 'md' : 'sm')
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = gridContainer.current
    if (!container || !gridWidth) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next: Record<string, number> = {}
        const widths: Record<string, number> = {}
        container.querySelectorAll<HTMLElement>('[data-dashboard-widget]').forEach(section => {
          const id = section.dataset.dashboardWidget!
          const header = section.querySelector<HTMLElement>('[data-widget-header]')!
          const content = section.querySelector<HTMLElement>('[data-widget-natural-content]')!
          // Charts fill the tile; measure their readable minimum, not allocated height.
          const contentHeight = id === 'charts' ? 300 : content.getBoundingClientRect().height
          let width = MIN_WIDGET_WIDTH[id as SectionId]
          content.querySelectorAll('table').forEach(table => {
            // Measure intrinsic column widths without changing the live table.
            const probe = table.cloneNode(true) as HTMLTableElement
            Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 'min-content' })
            table.parentElement!.appendChild(probe)
            width = Math.max(width, Math.ceil(probe.getBoundingClientRect().width) + 26)
            probe.remove()
          })
          widths[id] = width
          next[id] = Math.ceil(header.getBoundingClientRect().height + contentHeight + 24 + 12 + 2)
        })
        setContentWidths(previous => JSON.stringify(previous) === JSON.stringify(widths) ? previous : widths)
        setContentHeights(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
      })
    }
    const observer = new ResizeObserver(measure)
    container.querySelectorAll('[data-widget-header], [data-widget-natural-content]').forEach(node => observer.observe(node))
    measure()
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [gridWidth, breakpoint, editMode, dashboardLayout.hidden.join(','), gridVersion])

  function widgetMinimum(id: string) {
    const cols = GRID_COLS[breakpoint]
    const columnWidth = (gridWidth - 16 * (cols - 1)) / cols
    return {
      minW: Math.min(cols, Math.max(1, Math.ceil(((contentWidths[id] ?? MIN_WIDGET_WIDTH[id as SectionId]) + 16) / (columnWidth + 16)))),
      minH: Math.max(1, Math.ceil(((contentHeights[id] ?? 120) + 16) / 36)),
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(dashboardLayout))
      setSaveError(false)
    } catch { setSaveError(true) }
  }, [dashboardLayout])

  const handleLayoutChange = useCallback((_current: Layout[], layouts: Layouts) => {
    setDashboardLayout(previous => {
      const next = mergeVisibleLayouts(previous, layouts)
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next
    })
  }, [])

  function setWidgetVisible(id: SectionId, visible: boolean) {
    setDashboardLayout(previous => ({ ...previous,
      hidden: visible ? previous.hidden.filter(item => item !== id) : [...new Set([...previous.hidden, id])],
    }))
  }

  function adjustWidget(id: SectionId, key: string, resize: boolean) {
    setDashboardLayout(previous => ({ ...previous, layouts: { ...previous.layouts,
      [breakpoint]: previous.layouts[breakpoint].map(item => {
        if (item.i !== id) return item
        const next = { ...item }
        if (resize) {
          if (key === 'ArrowLeft') next.w = Math.max(widgetMinimum(id).minW, item.w - 1)
          if (key === 'ArrowRight') next.w = Math.min(GRID_COLS[breakpoint] - item.x, item.w + 1)
          if (key === 'ArrowUp') next.h = Math.max(widgetMinimum(id).minH, item.h - 1)
          if (key === 'ArrowDown') next.h = item.h + 1
        } else {
          if (key === 'ArrowLeft') next.x = Math.max(0, item.x - 1)
          if (key === 'ArrowRight') next.x = Math.min(GRID_COLS[breakpoint] - item.w, item.x + 1)
          if (key === 'ArrowUp') next.y = Math.max(0, item.y - 1)
          if (key === 'ArrowDown') next.y = item.y + 1
        }
        return next
      }),
    }}))
    setAnnouncement(`${SECTION_META[id].label} ${resize ? 'resized' : 'moved'}`)
  }

  const visibleWidgets = Object.keys(SECTION_META).filter(id => !dashboardLayout.hidden.includes(id)) as SectionId[]
  const visibleLayouts = Object.fromEntries(Object.entries(dashboardLayout.layouts).map(([name, layout]) =>
    [name, layout.filter(item => !dashboardLayout.hidden.includes(item.i)).map(item => {
      if (name !== breakpoint) return item
      const { minW, minH } = widgetMinimum(item.i)
      const w = Math.max(item.w, minW)
      return { ...item, minW, minH, w, h: Math.max(item.h, minH), x: Math.min(item.x, GRID_COLS[name] - w) }
    })]))

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
          <div className="dashboard-charts grid h-full min-h-0 grid-cols-1 @2xl:grid-cols-2 grid-rows-2 @2xl:grid-rows-1 gap-4">
            <EquityCurve data={cumulativePnl} loading={loading} fill />
            <DailyBars data={dailyPnl} loading={loading} fill />
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
              onClick={() => { setDashboardLayout(createDashboardLayout()); setGridVersion(v => v + 1); setAnnouncement('Default layout restored') }}
              className="text-text-dim hover:text-text-muted text-xs font-medium transition-colors"
            >
              Reset layout
            </button>
          )}
          <DateFilter value={dateRange} onChange={setDateRange} />
          <button
              onClick={() => { setEditMode(v => !v) }}
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
          <p className="text-xs text-text-muted">Drag a grip to move a widget and drag its bottom-right corner to resize. Focus a grip and use arrow keys to move, or Shift + arrows to resize. Widgets stop shrinking at the size needed to display their content. Each screen size saves its own layout.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SECTION_META).map(([id, meta]) => (
              <label key={id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${!dashboardLayout.hidden.includes(id) ? 'border-accent/30 bg-accent/10 text-text-primary' : 'border-border text-text-muted'}`}>
                <input type="checkbox" checked={!dashboardLayout.hidden.includes(id)} onChange={event => setWidgetVisible(id as SectionId, event.target.checked)} className="accent-accent" />
                {meta.label}
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
      <div ref={gridContainer}>
        {gridWidth > 0 && (
        <ResponsiveGrid
          key={gridVersion}
          className="dashboard-grid"
          width={gridWidth}
          layouts={visibleLayouts}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLS}
          rowHeight={20}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".dashboard-drag-handle"
          resizeHandles={['se']}
          compactType="vertical"
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={setBreakpoint}
        >
        {visibleWidgets.map(id => {
          const { label, subtitle } = SECTION_META[id]
          return (
            <div key={id}>
            <section
              data-dashboard-widget={id}
              aria-labelledby={`widget-${id}`}
              className={`@container h-full min-w-0 min-h-0 flex flex-col gap-3 rounded-xl p-3 border bg-surface/30 ${editMode ? 'border-dashed border-accent/30' : 'border-border'}`}
            >
              <div data-widget-header className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {editMode && (
                    <button
                      onKeyDown={event => {
                        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
                        event.preventDefault()
                        adjustWidget(id, event.key, event.shiftKey)
                      }}
                      title={`Drag to reposition ${label}`}
                      aria-label={`Drag to reposition ${label}; use arrow keys to move or Shift plus arrows to resize`}
                      className="dashboard-drag-handle touch-none p-1.5 rounded-md text-text-muted hover:bg-hover cursor-grab active:cursor-grabbing"
                    ><GripVertical className="w-4 h-4" /></button>
                  )}
                  <div className="min-w-0">
                    <h2 id={`widget-${id}`} className="text-text-primary font-semibold text-sm">{label}</h2>
                    <p className="text-text-dim text-xs mt-0.5">{subtitle}</p>
                  </div>
                </div>
                {editMode && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button onClick={() => setWidgetVisible(id, false)} aria-label={`Hide ${label}`} title={`Hide ${label}`} className="p-2 rounded-md text-text-muted hover:bg-hover"><EyeOff className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className={`dashboard-widget-content overflow-auto min-w-0 min-h-0 flex-1 ${id === 'charts' ? 'dashboard-widget-charts' : ''}`} tabIndex={0} role="region" aria-label={`${label} content`}><div data-widget-natural-content className={id === 'charts' ? 'h-full' : ''}>{renderContent(id)}</div></div>
            </section>
            </div>
          )
        })}
        </ResponsiveGrid>
        )}
      </div>
    </div>
  )
}
