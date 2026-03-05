import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { computeDailyPnl } from '../lib/utils'
import type { DbTrade } from '../types'
import TradeCalendar from '../components/calendar/TradeCalendar'

export default function CalendarPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<DbTrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('exit_time', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTrades(data ?? [])
        setLoading(false)
      })
  }, [user])

  const dailyPnl = computeDailyPnl(trades)

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-5">
        <h1 className="text-text-primary text-xl font-bold">Calendar</h1>
        <p className="text-text-muted text-sm mt-0.5">Daily P&L overview</p>
      </div>

      <TradeCalendar dailyPnl={dailyPnl} trades={trades} loading={loading} />
    </div>
  )
}
