import { useEffect, useMemo, useState } from 'react'
import type { CoachingCue, DbAccount, DbCoachingSettings, DbTrade } from '../types'
import { evaluateCoachingCues } from '../lib/coaching'
import { formatLocalDate } from '../lib/utils'

function dismissedKey(accountId: string): string {
  return `ttt_coaching_dismissed_${accountId}_${formatLocalDate(new Date())}`
}

function loadDismissed(accountId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(accountId))
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

export function useCoachingCues(
  allTrades: DbTrade[],
  activeAccount: DbAccount | null,
  settings: DbCoachingSettings,
) {
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    activeAccount ? loadDismissed(activeAccount.id) : new Set(),
  )

  useEffect(() => {
    setDismissed(activeAccount ? loadDismissed(activeAccount.id) : new Set())
  }, [activeAccount?.id])

  const allCues = useMemo(
    () => (activeAccount ? evaluateCoachingCues(allTrades, activeAccount, settings) : []),
    [allTrades, activeAccount, settings],
  )

  const cues: CoachingCue[] = allCues.filter(c => !dismissed.has(c.id))

  function dismiss(cueId: string) {
    if (!activeAccount) return
    setDismissed(prev => {
      const next = new Set(prev).add(cueId)
      localStorage.setItem(dismissedKey(activeAccount.id), JSON.stringify([...next]))
      return next
    })
  }

  return { cues, dismiss }
}
