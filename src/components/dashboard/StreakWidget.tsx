import { Flame, Trophy } from 'lucide-react'
import type { DbTrade } from '../../types'
import { currentProfitableDayStreak, bestProfitableDayStreak } from '../../lib/utils'

interface Props {
  trades: DbTrade[]
  loading: boolean
}

export default function StreakWidget({ trades, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-deep animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-deep rounded w-24 animate-pulse" />
          <div className="h-3 bg-deep rounded w-32 animate-pulse" />
        </div>
      </div>
    )
  }

  const current = currentProfitableDayStreak(trades)
  const best = bestProfitableDayStreak(trades)
  const isRecord = current > 0 && current >= best

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          current > 0 ? 'bg-profit/15' : 'bg-hover'
        }`}
      >
        <Flame className={`w-5 h-5 ${current > 0 ? 'text-profit' : 'text-text-dim'}`} />
      </div>
      <div className="flex-1 min-w-0">
        {current > 0 ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-text-primary">{current}</span>
              <span className="text-text-muted text-sm">
                day{current === 1 ? '' : 's'} profitable streak
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-text-dim text-xs">
              {isRecord ? (
                <>
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Personal best</span>
                </>
              ) : (
                <span>Best: {best} days</span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-text-primary text-sm font-medium">Start a streak today</div>
            <div className="text-text-dim text-xs mt-0.5">
              {best > 0 ? `Best so far: ${best} day${best === 1 ? '' : 's'}` : 'Log a profitable day to begin'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
