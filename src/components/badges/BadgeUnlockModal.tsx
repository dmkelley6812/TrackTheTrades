import { useMemo, useState } from 'react'
import {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Award, Trophy, Crown, DollarSign, Gem,
  Banknote, CircleDollarSign, Wallet, Landmark, Building2, Star,
  Shield, Infinity, BarChart3, Activity, Database, CalendarRange,
  CalendarHeart, Crosshair, Scale, Swords,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeDefinition, BadgeRarity } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Award, Trophy, Crown, DollarSign, Gem,
  Banknote, CircleDollarSign, Wallet, Landmark, Building2, Star,
  Shield, Infinity, BarChart3, Activity, Database, CalendarRange,
  CalendarHeart, Crosshair, Scale, Swords,
}

const RARITY_CONFIG: Record<BadgeRarity, {
  label: string
  iconGradient: string
  ringColor: string
  glowColor: string
  titleColor: string
  buttonGradient: string
  confettiColors: string[]
}> = {
  common: {
    label: 'Common',
    iconGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    ringColor: 'rgba(107,114,128,0.6)',
    glowColor: '107,114,128',
    titleColor: '#9ca3af',
    buttonGradient: 'linear-gradient(135deg, #374151, #1f2937)',
    confettiColors: ['#9ca3af', '#6b7280', '#d1d5db', '#e5e7eb', '#f3f4f6'],
  },
  rare: {
    label: 'Rare',
    iconGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    ringColor: 'rgba(74,124,244,0.7)',
    glowColor: '74,124,244',
    titleColor: '#93c5fd',
    buttonGradient: 'linear-gradient(135deg, #2563eb, #1e40af)',
    confettiColors: ['#4a7cf4', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  },
  epic: {
    label: 'Epic',
    iconGradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)',
    ringColor: 'rgba(168,85,247,0.7)',
    glowColor: '168,85,247',
    titleColor: '#d8b4fe',
    buttonGradient: 'linear-gradient(135deg, #9333ea, #7e22ce)',
    confettiColors: ['#c084fc', '#a855f7', '#d8b4fe', '#e9d5ff', '#f3e8ff'],
  },
  legendary: {
    label: 'Legendary',
    iconGradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    ringColor: 'rgba(251,191,36,0.7)',
    glowColor: '251,191,36',
    titleColor: '#fde68a',
    buttonGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    confettiColors: ['#fbbf24', '#f59e0b', '#fde68a', '#fef3c7', '#fffbeb', '#34d399', '#f87171'],
  },
}

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

interface ConfettiPiece {
  id: number
  x: number
  dur: number
  delay: number
  color: string
  size: number
  shape: 'rect' | 'circle'
  rotate: number
}

function makeConfetti(colors: string[]): ConfettiPiece[] {
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    dur: 2 + Math.random() * 1.5,
    delay: Math.random() * 1.2,
    color: colors[i % colors.length],
    size: 5 + Math.random() * 8,
    shape: Math.random() > 0.4 ? 'rect' : 'circle',
    rotate: Math.random() * 360,
  }))
}

interface Props {
  badges: BadgeDefinition[]
  onClose: () => void
}

export default function BadgeUnlockModal({ badges, onClose }: Props) {
  const [idx, setIdx] = useState(0)
  const badge = badges[idx]
  const cfg = RARITY_CONFIG[badge.rarity]
  const Icon = ICON_MAP[badge.icon] ?? Award
  const remaining = badges.length - idx - 1

  const confetti = useMemo(() => makeConfetti(cfg.confettiColors), [badge.id])

  function advance() {
    if (idx < badges.length - 1) setIdx(i => i + 1)
    else onClose()
  }

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
              background: p.color,
              transform: `rotate(${p.rotate}deg)`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Modal card */}
      <div
        key={badge.id}
        className="relative w-full max-w-sm rounded-2xl border p-8 text-center animate-modal-in overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #131425 0%, #0d0e1b 100%)',
          borderColor: cfg.ringColor,
          boxShadow: `0 0 60px rgba(${cfg.glowColor}, 0.3), 0 0 120px rgba(${cfg.glowColor}, 0.1)`,
        }}
      >
        {/* Background shimmer streak */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 30%, rgba(${cfg.glowColor}, 0.08) 50%, transparent 70%)`,
          }}
        />

        {/* NEW badge pill */}
        <div className="flex justify-center mb-5">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              background: `rgba(${cfg.glowColor}, 0.15)`,
              color: cfg.titleColor,
              border: `1px solid rgba(${cfg.glowColor}, 0.4)`,
            }}
          >
            Badge Unlocked!
          </span>
        </div>

        {/* Badge icon with rays */}
        <div className="relative flex items-center justify-center mx-auto mb-6" style={{ width: 128, height: 128 }}>
          {/* Rays */}
          {RAY_ANGLES.map((angle, i) => (
            <div
              key={angle}
              className="absolute animate-ray-out"
              style={{
                width: 3,
                height: 52,
                borderRadius: 2,
                background: `linear-gradient(to top, rgba(${cfg.glowColor}, 0.9), transparent)`,
                transformOrigin: 'bottom center',
                bottom: '50%',
                left: '50%',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                '--delay': `${i * 0.06}s`,
              } as React.CSSProperties}
            />
          ))}

          {/* Outer glow ring */}
          <div
            className="absolute rounded-full animate-glow-ring"
            style={{
              width: 112,
              height: 112,
              border: `2px solid rgba(${cfg.glowColor}, 0.5)`,
              boxShadow: `0 0 24px rgba(${cfg.glowColor}, 0.4), inset 0 0 24px rgba(${cfg.glowColor}, 0.1)`,
            }}
          />

          {/* Icon circle */}
          <div
            className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center animate-badge-pop"
            style={{
              background: cfg.iconGradient,
              boxShadow: `0 8px 32px rgba(${cfg.glowColor}, 0.5)`,
            }}
          >
            <Icon className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Rarity */}
        <div className="mb-1">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: cfg.titleColor }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary mb-2 leading-tight">
          {badge.title}
        </h2>

        {/* Description */}
        <p className="text-text-muted text-sm leading-relaxed mb-8 px-4">
          {badge.description}
        </p>

        {/* Queue indicator */}
        {badges.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {badges.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6,
                  background: i === idx
                    ? cfg.ringColor
                    : i < idx
                      ? `rgba(${cfg.glowColor}, 0.4)`
                      : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={advance}
          className="w-full py-3 rounded-xl text-white font-bold text-base tracking-wide transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          style={{
            background: cfg.buttonGradient,
            boxShadow: `0 4px 20px rgba(${cfg.glowColor}, 0.4)`,
          }}
        >
          {remaining > 0 ? `Next (${remaining} more)` : 'Awesome!'}
        </button>
      </div>
    </div>
  )
}
