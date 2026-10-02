import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BadgeDefinition, DbEarnedBadge, DbTrade } from '../types'
import { checkNewlyEarned, computeStaleBadges } from '../lib/badges'

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

  useEffect(() => {
    const refresh = () => { void load() }
    window.addEventListener('ttt_progression_changed', refresh)
    return () => window.removeEventListener('ttt_progression_changed', refresh)
  }, [load])

  // Evaluates all badge conditions against the provided trades, inserts any
  // newly-passed badges into the DB, updates local state, and returns the
  // definitions that were just awarded so the caller can show toasts.
  const checkAndAward = useCallback(
    async (trades: DbTrade[]): Promise<BadgeDefinition[]> => {
      if (!userId || !accountId) return []

      const { data: existing, error: readError } = await supabase.from('earned_badges')
        .select('*').eq('user_id', userId).eq('account_id', accountId)
      if (readError) throw readError
      const newlyEarned = checkNewlyEarned(trades, (existing ?? []) as DbEarnedBadge[])
      if (newlyEarned.length === 0) {
        window.dispatchEvent(new Event('ttt_progression_changed'))
        return []
      }

      const now = new Date().toISOString()
      const inserts = newlyEarned.map(def => ({
        user_id: userId,
        account_id: accountId,
        badge_id: def.id,
        earned_at: now,
      }))

      const { data, error } = await supabase
        .from('earned_badges')
        .upsert(inserts, { onConflict: 'user_id,account_id,badge_id', ignoreDuplicates: true })
        .select()

      if (!error && data) {
        setEarnedBadges(prev => [...prev, ...(data as DbEarnedBadge[])])
      }

      if (error) throw error
      window.dispatchEvent(new Event('ttt_progression_changed'))
      return newlyEarned.filter(def => data?.some(row => row.badge_id === def.id))
    },
    [userId, accountId, earnedBadges]
  )

  // Deletes any earned_badges rows whose condition no longer holds against the
  // given trades (e.g. after the user deletes the trades that earned them).
  const revokeStale = useCallback(
    async (trades: DbTrade[]): Promise<void> => {
      if (!userId || !accountId) return

      const { data: existing, error: readError } = await supabase.from('earned_badges')
        .select('*').eq('user_id', userId).eq('account_id', accountId)
      if (readError) throw readError
      const stale = computeStaleBadges(trades, (existing ?? []) as DbEarnedBadge[])
      if (stale.length === 0) {
        window.dispatchEvent(new Event('ttt_progression_changed'))
        return
      }

      const staleIds = stale.map(b => b.id)
      const { error } = await supabase
        .from('earned_badges')
        .delete()
        .in('id', staleIds)
        .eq('user_id', userId)

      if (!error) {
        setEarnedBadges(prev => prev.filter(b => !staleIds.includes(b.id)))
      }
      window.dispatchEvent(new Event('ttt_progression_changed'))
    },
    [userId, accountId, earnedBadges]
  )

  return { earnedBadges, loading, checkAndAward, revokeStale, refresh: load }
}
