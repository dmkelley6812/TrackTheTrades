import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useAccount } from './AccountContext'
import { supabase } from '../lib/supabase'
import { computeProgression, PROFILE_EMBLEMS, isEmblemUnlocked } from '../lib/progression'
import type { DbTrade, DbEarnedBadge } from '../types'
import { loadTradeHistory } from '../lib/trade-history'

const ProgressionContext = createContext({ progression: computeProgression([], []), loading: true, error: '', emblemId: 'rookie' })
export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [state, setState] = useState({ progression: computeProgression([], []), loading: true, error: '', emblemId: 'rookie' })
  useEffect(() => {
    let cancelled = false
    let request = 0
    async function load() {
      const current = ++request
      setState({ progression: computeProgression([], []), loading: true, error: '', emblemId: 'rookie' })
      if (!user || !activeAccount) return
      try {
        const trades = await loadTradeHistory(user.id, activeAccount.id)
        const { data: badges, error } = await supabase.from('earned_badges').select('*').eq('user_id', user.id).eq('account_id', activeAccount.id)
        if (error) throw error
        const { data: visits, error: visitError } = await supabase.rpc('record_app_visit')
        const progression = computeProgression(trades, (badges ?? []) as DbEarnedBadge[], visitError ? 0 : Number(visits ?? 0))
        const selected = PROFILE_EMBLEMS.find(e => e.id === user.user_metadata.profile_emblem && isEmblemUnlocked(e, progression))
        if (!cancelled && current === request) setState({ progression, loading: false, error: visitError ? 'App visit rewards are unavailable until migration 006 is applied.' : '', emblemId: selected?.id ?? 'rookie' })
      } catch {
        if (!cancelled && current === request) setState(s => ({ ...s, loading: false, error: 'Unable to load progression. Please refresh to try again.' }))
      }
    }
    void load()
    const refresh = () => { void load() }
    window.addEventListener('ttt_progression_changed', refresh)
    // Record a new server day for sessions left open overnight.
    const interval = window.setInterval(refresh, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('ttt_progression_changed', refresh) }
  }, [user, activeAccount?.id])
  return <ProgressionContext.Provider value={state}>{children}</ProgressionContext.Provider>
}
export const useProgression = () => useContext(ProgressionContext)
