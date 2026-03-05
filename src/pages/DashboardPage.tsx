import { useState, useEffect, useCallback } from 'react'
import { Upload, GripVertical } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent, DragOverlay, type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDateRange, computeStats, computeDailyPnl, computeCumulativePnl } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import type { DbTrade, DateRange } from '../types'
import DateFilter from '../components/dashboard/DateFilter'
import StatsCards from '../components/dashboard/StatsCards'
import { EquityCurve, DailyBars } from '../components/dashboard/PnlChart'
import RecentTrades from '../components/dashboard/RecentTrades'
import TradeCalendar from '../components/calendar/TradeCalendar'

// ─── Section definitions ──────────────────────────────────────────────────────

type SectionId = 'stats' | 'charts' | 'recent' | 'calendar'

const SECTION_META: Record<SectionId, { label: string; subtitle: string }> = {
  stats:    { label: 'Performance Stats',  subtitle: 'Key metrics for the selected period' },
  charts:   { label: 'Charts',             subtitle: 'Equity curve & daily P&L' },
  recent:   { label: 'Recent Trades',      subtitle: 'Latest trades in selected period' },
  calendar: { label: 'Calendar',           subtitle: 'Click a day to see its trades' },
}

const DEFAULT_ORDER: SectionId[] = ['stats', 'charts', 'recent', 'calendar']
const STORAGE_KEY = 'ttt_dashboard_order'

function loadOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: SectionId[] = JSON.parse(raw)
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_ORDER.length &&
        DEFAULT_ORDER.every(id => parsed.includes(id))
      ) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

// ─── Sortable section wrapper ─────────────────────────────────────────────────

function SortableSection({
  id, isDragging, children,
}: {
  id: SectionId
  isDragging: boolean
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id })
  const { label, subtitle } = SECTION_META[id]

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isSorting ? (transition ?? undefined) : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 select-none">
        <button
          {...listeners}
          {...attributes}
          className="flex items-center justify-center w-6 h-6 rounded-md text-text-dim hover:text-text-muted hover:bg-hover cursor-grab active:cursor-grabbing transition-colors touch-none"
          title={`Drag to reorder ${label}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-text-primary font-semibold text-sm">{label}</span>
        <span className="text-text-dim text-xs">{subtitle}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('this_week'))
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [allTrades, setAllTrades] = useState<DbTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [allLoading, setAllLoading] = useState(true)
  const [order, setOrder] = useState<SectionId[]>(loadOrder)
  const [activeId, setActiveId] = useState<SectionId | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const start = dateRange.start.toISOString().split('T')[0]
    const end = dateRange.end.toISOString().split('T')[0]
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

  useEffect(() => {
    if (!user) return
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('exit_time', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setAllTrades(data ?? [])
        setAllLoading(false)
      })
  }, [user])

  const stats = computeStats(trades)
  const dailyPnl = computeDailyPnl(trades)
  const cumulativePnl = computeCumulativePnl(trades)
  const allDailyPnl = computeDailyPnl(allTrades)
  const sortedByTime = [...trades].sort(
    (a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime()
  )
  const hasAnyTrades = allTrades.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as SectionId)
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (over && active.id !== over.id) {
      setOrder(prev => {
        const next = arrayMove(
          prev,
          prev.indexOf(active.id as SectionId),
          prev.indexOf(over.id as SectionId)
        )
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [])

  function renderContent(id: SectionId) {
    switch (id) {
      case 'stats':
        return <StatsCards stats={stats} loading={loading} />
      case 'charts':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EquityCurve data={cumulativePnl} loading={loading} />
            <DailyBars data={dailyPnl} loading={loading} />
          </div>
        )
      case 'recent':
        return <RecentTrades trades={sortedByTime} loading={loading} />
      case 'calendar':
        return <TradeCalendar dailyPnl={allDailyPnl} trades={allTrades} loading={allLoading} />
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5 flex items-center gap-1">
            Drag <GripVertical className="w-3.5 h-3.5 text-text-dim" /> to reorder sections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter value={dateRange} onChange={setDateRange} />
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

      {/* Sortable sections */}
      {(hasAnyTrades || loading) && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {order.map(id => (
                <SortableSection key={id} id={id} isDragging={activeId === id}>
                  {renderContent(id)}
                </SortableSection>
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeId && (
              <div className="bg-surface border border-accent/40 rounded-xl px-4 py-2.5 shadow-glow flex items-center gap-2 cursor-grabbing">
                <GripVertical className="w-4 h-4 text-accent" />
                <span className="text-text-primary text-sm font-medium">
                  {SECTION_META[activeId].label}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
