import { Link } from 'react-router-dom'
import { Trophy, ArrowRight, Award } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Crown, DollarSign, Gem,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeRarity, DbEarnedBadge } from '../../types'
import { BADGE_DEFINITIONS } from '../../lib/badges'

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, TrendingUp, Rocket, Zap, Hash, Layers, Medal,
  Flame, Sparkles, Target, BarChart2, CalendarCheck, Calendar,
  CheckSquare, CalendarDays, Award, Trophy, Crown, DollarSign, Gem,
}

const RARITY_ICON_COLOR: Record<BadgeRarity, string> = {
  common: 'text-text-muted',
  rare: 'text-accent',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
}

const RARITY_BG: Record<BadgeRarity, string> = {
  common: 'bg-hover',
  rare: 'bg-accent/15',
  epic: 'bg-purple-400/15',
  legendary: 'bg-amber-400/15',
}

const TOTAL = BADGE_DEFINITIONS.length

interface BadgesWidgetProps {
  earnedBadges: DbEarnedBadge[]
  loading: boolean
}

export default function BadgesWidget({ earnedBadges, loading }: BadgesWidgetProps) {
  const recentEarned = [...earnedBadges]
    .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
    .slice(0, 4)

  const earnedCount = earnedBadges.length

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-pulse">
        <div className="h-4 w-32 bg-hover rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-hover rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span className="text-text-primary font-semibold text-sm">Badges</span>
          <span className="text-text-dim text-xs tabular-nums">
            {earnedCount} / {TOTAL}
          </span>
        </div>
        <Link
          to="/badges"
          className="flex items-center gap-1 text-accent text-xs hover:text-accent/80 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-deep rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-700"
          style={{ width: `${(earnedCount / TOTAL) * 100}%` }}
        />
      </div>

      {/* Recent badges or empty state */}
      {recentEarned.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-hover flex items-center justify-center">
            <Trophy className="w-5 h-5 text-text-dim" />
          </div>
          <p className="text-text-dim text-xs">
            Keep trading to earn your first badge.
          </p>
          <Link to="/badges" className="text-accent text-xs hover:underline">
            See all badges →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {recentEarned.map(eb => {
            const def = BADGE_DEFINITIONS.find(d => d.id === eb.badge_id)
            if (!def) return null
            const Icon = ICON_MAP[def.icon] ?? Award
            return (
              <Link
                key={eb.id}
                to="/badges"
                title={`${def.title} — ${format(parseISO(eb.earned_at), 'MMM d, yyyy')}`}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={`w-12 h-12 rounded-xl ${RARITY_BG[def.rarity]} flex items-center justify-center transition-transform group-hover:scale-105`}>
                  <Icon className={`w-5 h-5 ${RARITY_ICON_COLOR[def.rarity]}`} />
                </div>
                <span className="text-[10px] text-text-dim text-center leading-tight line-clamp-2">
                  {def.title}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
