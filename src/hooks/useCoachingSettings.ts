import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbCoachingSettings } from '../types'
import { DEFAULT_COACHING_SETTINGS } from '../lib/coaching'

export function useCoachingSettings(userId: string | null) {
  const [settings, setSettings] = useState<DbCoachingSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) {
      setSettings(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('coaching_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setSettings(data as DbCoachingSettings | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Upserts the settings row, seeding defaults for any field not yet set.
  const updateSettings = useCallback(
    async (partial: Partial<DbCoachingSettings>) => {
      if (!userId) return
      const { data, error } = await supabase
        .from('coaching_settings')
        .upsert(
          { ...DEFAULT_COACHING_SETTINGS, ...settings, ...partial, user_id: userId },
          { onConflict: 'user_id' },
        )
        .select()
        .single()
      if (!error && data) setSettings(data as DbCoachingSettings)
    },
    [userId, settings],
  )

  const effectiveSettings: DbCoachingSettings =
    settings ?? {
      id: '',
      user_id: userId ?? '',
      created_at: '',
      updated_at: '',
      ...DEFAULT_COACHING_SETTINGS,
    }

  return { settings: effectiveSettings, loading, updateSettings }
}
