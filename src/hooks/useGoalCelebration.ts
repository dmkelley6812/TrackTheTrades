import { useEffect, useRef, useState } from 'react'
import type { DbGoal, DbTrade, GoalProgress } from '../types'
import { computeGoalProgress } from '../lib/goals'

const CELEBRATED_KEY = 'ttt_celebrated_goals'

function loadCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveCelebrated(ids: Set<string>) {
  localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...ids]))
}

export interface CelebrationItem {
  goal: DbGoal
  progress: GoalProgress
}

// Watches active goals and queues any that newly cross their achievement
// threshold. Each goal id is celebrated at most once, tracked in
// localStorage so it never re-fires on reload or across sessions.
export function useGoalCelebration(goals: DbGoal[], allTrades: DbTrade[]) {
  const [queue, setQueue] = useState<CelebrationItem[]>([])
  const celebratedRef = useRef<Set<string>>(loadCelebrated())

  useEffect(() => {
    const newlyAchieved: CelebrationItem[] = []
    for (const goal of goals) {
      if (goal.status !== 'active') continue
      if (celebratedRef.current.has(goal.id)) continue
      const progress = computeGoalProgress(goal, allTrades)
      if (progress.isAchieved) newlyAchieved.push({ goal, progress })
    }
    if (newlyAchieved.length > 0) {
      setQueue(prev => {
        const existingIds = new Set(prev.map(item => item.goal.id))
        const toAdd = newlyAchieved.filter(item => !existingIds.has(item.goal.id))
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
  }, [goals, allTrades])

  function celebrate(goalId: string) {
    celebratedRef.current.add(goalId)
    saveCelebrated(celebratedRef.current)
    setQueue(prev => prev.filter(item => item.goal.id !== goalId))
  }

  return { queue, celebrate }
}
