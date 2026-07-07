import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Percent, CalendarDays, Calendar, TrendingUp, TrendingDown, Hash, Trophy,
} from 'lucide-react'
import type { GoalType } from '../../types'
import type { CelebrationItem } from '../../hooks/useGoalCelebration'
import { formatCurrency } from '../../lib/utils'

const GOAL_ICONS: Record<GoalType, React.ComponentType<{ className?: string }>> = {
  profit_target:    DollarSign,
  win_rate:         Percent,
  consistent_days:  CalendarDays,
  consistent_weeks: Calendar,
  profit_factor:    TrendingUp,
  trade_count:      Hash,
  max_drawdown:     TrendingDown,
}

function fmtValue(type: GoalType, value: number): string {
  switch (type) {
    case 'profit_target': return formatCurrency(value)
    case 'win_rate':       return `${value.toFixed(1)}%`
    case 'consistent_days': return `${Math.floor(value)} days`
    case 'consistent_weeks': return `${Math.floor(value)} weeks`
    case 'profit_factor': return `${value.toFixed(2)}x`
    case 'trade_count':   return `${Math.floor(value)} trades`
    case 'max_drawdown':  return formatCurrency(value)
  }
}

const GLOW = '34,217,132' // profit green

interface ConfettiPiece {
  id: number
  x: number
  dur: number
  delay: number
  size: number
  shape: 'rect' | 'circle'
  rotate: number
}

const CONFETTI_COLORS = ['#22d984', '#4ade80', '#86efac', '#bbf7d0', '#4a7cf4', '#fbbf24']

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    dur: 2 + Math.random() * 1.5,
    delay: Math.random() * 1.2,
    size: 5 + Math.random() * 8,
    shape: Math.random() > 0.4 ? 'rect' : 'circle',
    rotate: Math.random() * 360,
  }))
}

interface Props {
  item: CelebrationItem
  onClose: () => void
}

export default function GoalAchievedModal({ item, onClose }: Props) {
  const { goal, progress } = item
  const Icon = GOAL_ICONS[goal.type]
  const confetti = useMemo(() => makeConfetti(), [goal.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-overlay-in"
      style={{ background: 'rgba(6,7,17,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map(p => (
          <div
            key={p.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${p.x}%`,
              top: 0,
              width: p.shape === 'rect' ? `${p.size}px` : `${p.size}px`,
              height: p.shape === 'rect' ? `${p.size * 0.5}px` : `${p.size}px`,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              background: CONFETTI_COLORS[p.id % CONFETTI_COLORS.length],
              transform: `rotate(${p.rotate}deg)`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border p-8 text-center animate-modal-in overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #131425 0%, #0d0e1b 100%)',
          borderColor: `rgba(${GLOW},0.6)`,
          boxShadow: `0 0 60px rgba(${GLOW}, 0.3), 0 0 120px rgba(${GLOW}, 0.1)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 30%, rgba(${GLOW}, 0.08) 50%, transparent 70%)`,
          }}
        />

        <div className="flex justify-center mb-5">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              background: `rgba(${GLOW}, 0.15)`,
              color: '#6ee7a8',
              border: `1px solid rgba(${GLOW}, 0.4)`,
            }}
          >
            Goal Achieved!
          </span>
        </div>

        <div className="relative flex items-center justify-center mx-auto mb-6" style={{ width: 128, height: 128 }}>
          <div
            className="absolute rounded-full animate-glow-ring"
            style={{
              width: 112,
              height: 112,
              border: `2px solid rgba(${GLOW}, 0.5)`,
              boxShadow: `0 0 24px rgba(${GLOW}, 0.4), inset 0 0 24px rgba(${GLOW}, 0.1)`,
            }}
          />
          <div
            className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center animate-badge-pop"
            style={{
              background: 'linear-gradient(135deg, #22d984 0%, #0d4a2a 100%)',
              boxShadow: `0 8px 32px rgba(${GLOW}, 0.5)`,
            }}
          >
            <Icon className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2 leading-tight">
          {goal.title}
        </h2>

        <p className="text-text-muted text-sm leading-relaxed mb-2 px-4">
          {fmtValue(goal.type, progress.currentValue)} of {fmtValue(goal.type, goal.target_value)}
        </p>

        <div className="flex items-center justify-center gap-1.5 text-profit text-xs font-medium mb-8">
          <Trophy className="w-3.5 h-3.5" />
          <span>Target hit</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-white font-bold text-base tracking-wide transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #22d984, #16a34a)',
            boxShadow: `0 4px 20px rgba(${GLOW}, 0.4)`,
          }}
        >
          Nice!
        </button>

        <Link
          to="/goals"
          onClick={onClose}
          className="block mt-3 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          View All Goals →
        </Link>
      </div>
    </div>
  )
}
