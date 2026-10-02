import { supabase } from './supabase'
import type { DbTrade } from '../types'

// Supabase returns at most 1,000 rows by default. Progression must include the
// entire journal, including accounts with years of trading history.
export async function loadTradeHistory(userId: string, accountId: string): Promise<DbTrade[]> {
  const trades: DbTrade[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('trades').select('*')
      .eq('user_id', userId).eq('account_id', accountId).order('id').range(offset, offset + 999)
    if (error) throw error
    trades.push(...(data ?? []) as DbTrade[])
    if ((data?.length ?? 0) < 1000) return trades
  }
}
