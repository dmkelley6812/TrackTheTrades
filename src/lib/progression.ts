import type { DbTrade, DbEarnedBadge } from '../types'
import { BADGE_DEFINITIONS } from './badges'

export const BADGE_XP = { common: 100, rare: 300, epic: 750, legendary: 1500 }
export const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 6000, 10000, 16000, 25000, 40000, 60000, 90000, 130000]
export function levelForXp(xp: number) {
  let level = 1
  while (level < LEVEL_THRESHOLDS.length && xp >= LEVEL_THRESHOLDS[level]) level++
  const floor = LEVEL_THRESHOLDS[level - 1]
  const next = LEVEL_THRESHOLDS[level] ?? null
  return { level, xpInLevel: xp - floor, xpNeeded: next === null ? null : next - floor, next }
}

export function computeProgression(trades: DbTrade[], badges: DbEarnedBadge[], visits = 0) {
  const days = new Map<string, number>()
  let netProfit = 0
  let turnover = 0
  for (const t of trades) {
    days.set(t.trade_date, (days.get(t.trade_date) ?? 0) + 1)
    netProfit += t.net_pnl
    // Contract-adjusted entry and exit notional; this is volume, not capital at risk.
    turnover += (Math.abs(t.entry_price) + Math.abs(t.exit_price)) * Math.abs(t.qty) * Math.abs(t.point_value)
  }
  const badgeIds = new Set(badges.map(b => b.badge_id))
  const achievements = BADGE_DEFINITIONS.reduce((sum, b) => sum + (badgeIds.has(b.id) ? BADGE_XP[b.rarity] : 0), 0)
  const logging = [...days.values()].reduce((sum, count) => sum + 50 + Math.min(count, 10) * 10, 0)
  // Cumulative tiers make rewards predictable, with diminishing rewards per dollar.
  const profitTiers = [100, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]
  const profitability = profitTiers.reduce((sum, target, i) => sum + (netProfit >= target ? (i + 1) * 250 : 0), 0)
  const volume = [100000, 1000000, 10000000, 100000000, 1000000000].reduce((sum, target) => sum + (turnover >= target ? 250 : 0), 0)
  const loyalty = visits * 25
  const totalXp = achievements + logging + profitability + volume + loyalty
  return { totalXp, achievements, logging, profitability, volume, loyalty, netProfit, turnover, tradingDays: days.size, visits, ...levelForXp(totalXp) }
}
export type Progression = ReturnType<typeof computeProgression>
export const PROFILE_EMBLEMS = [
  { id: 'rookie', title: 'Rookie', xp: 0, icon: 'Footprints', color: '#94a3b8', requirement: 'Available to everyone', qualifies: (_p: Progression) => true },
  { id: 'bronze', title: 'Bronze Scout', xp: 1500, icon: 'Shield', color: '#cd7f32', requirement: '1,500 XP · Level 3', qualifies: (_p: Progression) => true },
  { id: 'silver', title: 'Silver Strategist', xp: 6000, icon: 'Swords', color: '#cbd5e1', requirement: '6,000 XP · Level 5', qualifies: (_p: Progression) => true },
  { id: 'gold', title: 'Golden Ace', xp: 16000, icon: 'Trophy', color: '#fbbf24', requirement: '16,000 XP · Level 7', qualifies: (_p: Progression) => true },
  { id: 'diamond', title: 'Diamond Elite', xp: 40000, icon: 'Gem', color: '#22d3ee', requirement: '40,000 XP · Level 9', qualifies: (_p: Progression) => true },
  { id: 'profit', title: 'Profit Sovereign', xp: 25000, icon: 'Crown', color: '#a855f7', requirement: '25,000 XP + $100,000 net profit + 100 trading days', qualifies: (p: Progression) => p.netProfit >= 100000 && p.tradingDays >= 100 },
  { id: 'whale', title: 'Market Titan', xp: 40000, icon: 'Landmark', color: '#fb7185', requirement: '40,000 XP + $100M notional volume + 250 trading days', qualifies: (p: Progression) => p.turnover >= 100000000 && p.tradingDays >= 250 },
  { id: 'veteran', title: 'Eternal Veteran', xp: 25000, icon: 'CalendarHeart', color: '#34d399', requirement: '25,000 XP + 365 distinct app visit days', qualifies: (p: Progression) => p.visits >= 365 },
  { id: 'legend', title: 'Celestial Legend', xp: 130000, icon: 'Sparkles', color: '#f59e0b', requirement: '130,000 XP + 500 trading days', qualifies: (p: Progression) => p.tradingDays >= 500 },
]
export function isEmblemUnlocked(emblem: typeof PROFILE_EMBLEMS[number], p: Progression) {
  return p.totalXp >= emblem.xp && emblem.qualifies(p)
}
