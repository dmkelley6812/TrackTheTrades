import { useState, useEffect, useRef } from 'react'
import { Trophy, Star, Zap, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { useBadges } from '../hooks/useBadges'
import { BADGE_DEFINITIONS, computeBadgeStatuses } from '../lib/badges'
import type { BadgeCategory, BadgeDefinition, BadgeWithStatus, DbTrade } from '../types'
import BadgeCard from '../components/badges/BadgeCard'
import BadgeUnlockModal from '../components/badges/BadgeUnlockModal'
import ProfileEmblems, { ProfileAvatar } from '../components/badges/ProfileEmblems'
import { useProgression } from '../contexts/ProgressionContext'
import { loadTradeHistory } from '../lib/trade-history'
import toast from 'react-hot-toast'

const CATEGORIES: { id: BadgeCategory; label: string; description: string; emoji: string }[] = [
  { id: 'milestone',   label: 'Milestones',   description: 'One-time achievements that mark your firsts', emoji: '🏁' },
  { id: 'performance', label: 'Performance',  description: 'Earned by hitting quality thresholds',        emoji: '🎯' },
  { id: 'discipline',  label: 'Discipline',   description: 'Habits that make a trader great',             emoji: '📅' },
  { id: 'mastery',     label: 'Mastery',      description: 'Long-term achievements earned over time',     emoji: '🏆' },
]

const TOTAL = BADGE_DEFINITIONS.length

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'] as const

export default function BadgesPage() {
  const { progression, loading: progressionLoading } = useProgression()
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [allTrades, setAllTrades] = useState<DbTrade[]>([])
  const [tradesLoading, setTradesLoading] = useState(true)
  const [unlockQueue, setUnlockQueue] = useState<BadgeDefinition[]>([])
  const [recentlyEarnedIds, setRecentlyEarnedIds] = useState<Set<string>>(new Set())

  const { earnedBadges, loading: badgesLoading, checkAndAward } = useBadges(
    user?.id ?? null,
    activeAccount?.id ?? null
  )

  const checkedForAccount = useRef<string | null>(null)
  const seenForAccount = useRef<string | null>(null)

  // Flags badges earned since the last time this account's Badges page was viewed
  useEffect(() => {
    if (badgesLoading || !activeAccount) return
    if (seenForAccount.current === activeAccount.id) return
    seenForAccount.current = activeAccount.id

    const storageKey = `ttt_badges_last_seen_${activeAccount.id}`
    const lastSeen = localStorage.getItem(storageKey)
    const recent = new Set(
      earnedBadges.filter(b => !lastSeen || b.earned_at > lastSeen).map(b => b.badge_id)
    )
    setRecentlyEarnedIds(recent)
    localStorage.setItem(storageKey, new Date().toISOString())
  }, [badgesLoading, activeAccount, earnedBadges])

  useEffect(() => {
    if (!user || !activeAccount) return
    setTradesLoading(true)
    checkedForAccount.current = null
    let cancelled = false
    setAllTrades([])
    loadTradeHistory(user.id, activeAccount.id)
      .then(data => {
        if (cancelled) return
        setAllTrades(data)
        setTradesLoading(false)
      })
      .catch(() => { if (!cancelled) toast.error('Could not load badge history. Please refresh to retry.') })
    return () => { cancelled = true }
  }, [user, activeAccount])

  useEffect(() => {
    if (tradesLoading || badgesLoading) return
    if (checkedForAccount.current === activeAccount?.id) return
    checkedForAccount.current = activeAccount?.id ?? null

    checkAndAward(allTrades).then(newBadges => {
      if (newBadges.length > 0) {
        setUnlockQueue(newBadges)
        setRecentlyEarnedIds(prev => new Set([...prev, ...newBadges.map(b => b.id)]))
      }
    }).catch(() => toast.error('Could not save badge rewards. Please refresh to retry.'))
  }, [tradesLoading, badgesLoading, allTrades, activeAccount?.id, checkAndAward])

  const loading = tradesLoading || badgesLoading
  const statuses: BadgeWithStatus[] = loading
    ? []
    : computeBadgeStatuses(allTrades, earnedBadges)

  const earnedCount = statuses.filter(s => s.isEarned).length
  const { level, xpInLevel, xpNeeded, totalXp } = progression
  const xpPct = xpNeeded === null ? 100 : Math.round((xpInLevel / xpNeeded) * 100)

  const byCategory = (cat: BadgeCategory) =>
    statuses.filter(s => s.definition.category === cat)

  const rarityCount = (rarity: string) =>
    statuses.filter(s => s.isEarned && s.definition.rarity === rarity).length

  return (
    <>
      {unlockQueue.length > 0 && (
        <BadgeUnlockModal
          badges={unlockQueue}
          onClose={() => setUnlockQueue([])}
        />
      )}

      <div className="p-6 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary text-xl font-bold">Badges</h1>
            <p className="text-text-muted text-sm mt-0.5">
              Achievements earned from your trading activity
            </p>
          </div>

          {/* Rarity summary pills */}
          {!loading && (
            <div className="flex items-center gap-2 flex-wrap">
              {rarityCount('legendary') > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/25">
                  <Star className="w-3 h-3" />{rarityCount('legendary')} Legendary
                </span>
              )}
              {rarityCount('epic') > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/25">
                  <Zap className="w-3 h-3" />{rarityCount('epic')} Epic
                </span>
              )}
              {rarityCount('rare') > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border text-accent bg-accent/10 border-accent/25">
                  <Shield className="w-3 h-3" />{rarityCount('rare')} Rare
                </span>
              )}
            </div>
          )}
        </div>

        {/* Level / XP progress bar */}
        {!loading && !progressionLoading && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                  <ProfileAvatar />
                </div>
                <div>
                  <div className="text-text-primary font-bold text-lg leading-none">
                    Level {level}
                  </div>
                  <div className="text-text-muted text-xs mt-0.5">
                    {earnedCount} / {TOTAL} badges earned
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-text-primary font-bold tabular-nums">
                  {totalXp.toLocaleString()} <span className="text-text-muted font-normal text-sm">total XP</span>
                </div>
                <div className="text-text-dim text-xs mt-0.5">{xpNeeded === null ? 'Maximum level reached' : `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP toward level ${level + 1}`}</div>
              </div>
            </div>

            {/* XP bar */}
            <div className="w-full h-2.5 rounded-full bg-deep overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, #4a7cf4, #7c3aed)',
                  boxShadow: xpPct > 0 ? '0 0 8px rgba(74,124,244,0.6)' : undefined,
                }}
              />
            </div>

            {/* Overall completion */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              {RARITY_ORDER.map(r => {
                const total = BADGE_DEFINITIONS.filter(b => b.rarity === r).length
                const earned = rarityCount(r)
                const colors: Record<string, string> = {
                  common: '#6b7280',
                  rare: '#4a7cf4',
                  epic: '#a855f7',
                  legendary: '#f59e0b',
                }
                const labels: Record<string, string> = {
                  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
                }
                return (
                  <div key={r} className="flex-1 text-center">
                    <div
                      className="text-lg font-bold tabular-nums"
                      style={{ color: earned > 0 ? colors[r] : '#3d4263' }}
                    >
                      {earned}
                    </div>
                    <div className="text-[10px] text-text-dim uppercase tracking-wide">
                      {labels[r]}
                    </div>
                    <div className="text-[9px] text-text-dim opacity-60">/ {total}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <ProfileEmblems />

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-surface border border-border animate-pulse" />
            ))}
          </div>
        )}

        {/* Category sections */}
        {!loading && CATEGORIES.map(cat => {
          const cards = byCategory(cat.id)
          const catEarned = cards.filter(c => c.isEarned).length
          const catPct = Math.round((catEarned / cards.length) * 100)

          return (
            <section key={cat.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xl" role="img" aria-label={cat.label}>{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-text-primary font-bold text-base">{cat.label}</h2>
                    <span className="text-text-dim text-sm hidden sm:inline">{cat.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-1.5 rounded-full bg-deep overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${catPct}%`,
                        background: catPct === 100
                          ? 'linear-gradient(90deg, #22d984, #4ade80)'
                          : 'linear-gradient(90deg, #4a7cf4, #7c3aed)',
                      }}
                    />
                  </div>
                  <span className="text-text-dim text-xs tabular-nums w-10 text-right">
                    {catEarned}/{cards.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {cards.map(s => (
                  <BadgeCard
                    key={s.definition.id}
                    badgeStatus={s}
                    isNew={recentlyEarnedIds.has(s.definition.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
