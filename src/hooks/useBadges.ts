import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BadgeDefinition, DbEarnedBadge, DbTrade } from '../types'
import { checkNewlyEarned } from '../lib/badges'

export function useBadges(userId: string | null, accountId: string | null) {
  const [earnedBadges, setEarnedBadges] = useState<DbEarnedBadge[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId || !accountId) {
      setEarnedBadges([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('earned_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('earned_at', { ascending: false })
    setEarnedBadges((data as DbEarnedBadge[]) ?? [])
    setLoading(false)
  }, [userId, accountId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Evaluates all badge conditions against the provided trades, inserts any
  // newly-passed badges into the DB, updates local state, and returns the
  // definitions that were just awarded so the caller can show toasts.
  const checkAndAward = useCallback(
    async (trades: DbTrade[]): Promise<BadgeDefinition[]> => {
      if (!userId || !accountId) return []

      const newlyEarned = checkNewlyEarned(trades, earnedBadges)
      if (newlyEarned.length === 0) return []

      const now = new Date().toISOString()
      const inserts = newlyEarned.map(def => ({
        user_id: userId,
        account_id: accountId,
        badge_id: def.id,
        earned_at: now,
      }))

      const { data, error } = await supabase
        .from('earned_badges')
        .insert(inserts)
        .select()

      if (!error && data) {
        setEarnedBadges(prev => [...prev, ...(data as DbEarnedBadge[])])
      }

      return newlyEarned
    },
    [userId, accountId, earnedBadges]
  )

  return { earnedBadges, loading, checkAndAward, refresh: load }
}
