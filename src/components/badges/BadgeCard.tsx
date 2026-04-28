import { format, parseISO } from 'date-fns'
import { Lock } from 'lucide-react'
import {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Award, Trophy, Crown, DollarSign, Gem,
  Banknote, CircleDollarSign, Wallet, Landmark, Building2, Star,
  Shield, Infinity, BarChart3, Activity, Database, CalendarRange,
  CalendarHeart, Crosshair, Scale, Swords,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeRarity, BadgeWithStatus } from '../../types'

export const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Award, Trophy, Crown, DollarSign, Gem,
  Banknote, CircleDollarSign, Wallet, Landmark, Building2, Star,
  Shield, Infinity, BarChart3, Activity, Database, CalendarRange,
  CalendarHeart, Crosshair, Scale, Swords,
}

interface RarityConfig {
  label: string
  labelCls: string
  iconGradient: string
  iconGlow: string
  glowRgb: string
  cardBorder: string
  cardGlow: string
  progressBar: string
  titleColor: string
}

const RARITY: Record<BadgeRarity, RarityConfig> = {
  common: {
    label: 'Common',
    labelCls: 'text-text-muted bg-hover border-border',
    iconGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    iconGlow: '0 4px 16px rgba(107,114,128,0.3)',
    glowRgb: '107,114,128',
    cardBorder: '#374151',
    cardGlow: '',
    progressBar: '#6b7280',
    titleColor: '#9ca3af',
  },
  rare: {
    label: 'Rare',
    labelCls: 'text-accent bg-accent/10 border-accent/30',
    iconGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    iconGlow: '0 4px 20px rgba(74,124,244,0.5)',
    glowRgb: '74,124,244',
    cardBorder: 'rgba(74,124,244,0.5)',
    cardGlow: '0 0 24px rgba(74,124,244,0.12)',
    progressBar: '#4a7cf4',
    titleColor: '#93c5fd',
  },
  epic: {
    label: 'Epic',
    labelCls: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    iconGradient: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)',
    iconGlow: '0 4px 20px rgba(147,51,234,0.5)',
    glowRgb: '147,51,234',
    cardBorder: 'rgba(168,85,247,0.5)',
    cardGlow: '0 0 28px rgba(168,85,247,0.14)',
    progressBar: '#a855f7',
    titleColor: '#d8b4fe',
  },
  legendary: {
    label: 'Legendary',
    labelCls: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    iconGradient: 'linear-gradient(135deg, #f59e0b 0%, #92400e 100%)',
    iconGlow: '0 4px 24px rgba(245,158,11,0.55)',
    glowRgb: '245,158,11',
    cardBorder: 'rgba(251,191,36,0.5)',
    cardGlow: '0 0 32px rgba(245,158,11,0.16)',
    progressBar: '#f59e0b',
    titleColor: '#fde68a',
  },
}

interface BadgeCardProps {
  badgeStatus: BadgeWithStatus
}

export default function BadgeCard({ badgeStatus }: BadgeCardProps) {
  const { definition: def, isEarned, earnedAt, progress } = badgeStatus
  const r = RARITY[def.rarity]
  const Icon = ICON_MAP[def.icon] ?? Award

  const pct = progress
    ? Math.min(Math.round((progress.current / progress.target) * 100), 100)
    : null

  return (
    <div
      className="group relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-300 hover:scale-[1.03] cursor-default overflow-hidden"
      style={
        isEarned
          ? {
              background: 'linear-gradient(160deg, #131425 0%, #0d0e1b 100%)',
              borderColor: r.cardBorder,
              boxShadow: r.cardGlow || undefined,
            }
          : {
              background: '#0a0b17',
              borderColor: '#1a1c2e',
            }
      }
    >
      {/* Shimmer on earned */}
      {isEarned && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 w-1/3 animate-shimmer"
            style={{
              background: `linear-gradient(105deg, transparent, rgba(${r.glowRgb}, 0.12), transparent)`,
            }}
          />
        </div>
      )}

      {/* Rarity pill (top right) */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${r.labelCls}`}>
          {r.label}
        </span>
      </div>

      {/* Icon circle */}
      <div className="relative mt-3 mb-1">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={
            isEarned
              ? { background: r.iconGradient, boxShadow: r.iconGlow }
              : { background: '#111320', boxShadow: 'none' }
          }
        >
          {isEarned ? (
            <Icon className="w-8 h-8 text-white drop-shadow" />
          ) : (
            <>
              <Icon className="w-8 h-8 text-text-dim opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                <Lock className="w-4 h-4 text-text-dim opacity-50" />
              </div>
            </>
          )}
        </div>

        {/* Glow ring on hover (earned only) */}
        {isEarned && (
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ boxShadow: `0 0 20px rgba(${r.glowRgb}, 0.45)` }}
          />
        )}
      </div>

      {/* Title */}
      <div className="space-y-1 px-1">
        <h3
          className="font-bold text-sm leading-tight"
          style={{ color: isEarned ? r.titleColor : '#3d4263' }}
        >
          {def.title}
        </h3>
        <p className="text-[11px] leading-snug" style={{ color: isEarned ? '#6b7194' : '#2a2d48' }}>
          {def.description}
        </p>
      </div>

      {/* Earned date OR progress */}
      <div className="w-full mt-auto pt-1">
        {isEarned && earnedAt ? (
          <div
            className="text-[10px] font-semibold"
            style={{ color: `rgba(${r.glowRgb}, 0.9)` }}
          >
            ✓ {format(parseISO(earnedAt), 'MMM d, yyyy')}
          </div>
        ) : pct !== null ? (
          <div className="w-full space-y-1.5">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1c2e' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 80
                    ? r.progressBar
                    : `linear-gradient(90deg, rgba(${r.glowRgb},0.4), rgba(${r.glowRgb},0.7))`,
                }}
              />
            </div>
            <div className="text-[9px] tabular-nums" style={{ color: '#3d4263' }}>
              {progress!.current.toLocaleString()} / {progress!.target.toLocaleString()}
            </div>
            {def.progressLabel && (
              <div className="text-[9px] italic" style={{ color: '#2a2d48' }}>
                {def.progressLabel}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px]" style={{ color: '#2a2d48' }}>Locked</div>
        )}
      </div>
    </div>
  )
}
