import type { Layout, Layouts } from 'react-grid-layout'

export const GRID_STORAGE_KEY = 'ttt_dashboard_grid_v3'
export const GRID_BREAKPOINTS = { lg: 1000, md: 700, sm: 0 }
export const GRID_COLS: Record<string, number> = { lg: 12, md: 8, sm: 4 }
const IDS = ['stats', 'charts', 'coaching', 'streak', 'goals', 'forecast', 'weekly', 'recent', 'calendar']
export type DashboardLayout = { layouts: Layouts; hidden: string[] }

export function createDashboardLayout(): DashboardLayout {
  // Starting dimensions only; every tile can be resized in either direction.
  const desktop: Layout[] = [
    { i: 'stats', x: 0, y: 0, w: 12, h: 9 },
    { i: 'charts', x: 0, y: 9, w: 8, h: 14 },
    { i: 'coaching', x: 8, y: 9, w: 4, h: 5 },
    { i: 'streak', x: 8, y: 14, w: 4, h: 4 },
    { i: 'forecast', x: 8, y: 18, w: 4, h: 10 },
    { i: 'goals', x: 0, y: 23, w: 8, h: 10 },
    { i: 'weekly', x: 0, y: 33, w: 6, h: 14 },
    { i: 'recent', x: 6, y: 33, w: 6, h: 14 },
    { i: 'calendar', x: 0, y: 47, w: 12, h: 17 },
  ]
  function stacked(cols: number): Layout[] {
    let y = 0
    return IDS.map(id => {
      const original = desktop.find(item => item.i === id)!
      const h = id === 'charts' ? 17 : id === 'stats' ? 19 : original.h
      const item = { i: id, x: 0, y, w: cols, h }
      y += h
      return item
    })
  }
  return { layouts: { lg: desktop, md: stacked(8), sm: stacked(4) }, hidden: [] }
}

export function loadDashboardLayout(): DashboardLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(GRID_STORAGE_KEY) ?? 'null')
    if (!saved || !Array.isArray(saved.hidden) || !saved.hidden.every((id: string) => IDS.includes(id))) return createDashboardLayout()
    for (const [name, cols] of Object.entries(GRID_COLS)) {
      const layout = saved.layouts?.[name]
      if (!Array.isArray(layout) || layout.length !== IDS.length || new Set(layout.map(item => item?.i)).size !== IDS.length ||
        !layout.every(item => item && IDS.includes(item.i) && [item.x, item.y, item.w, item.h].every(Number.isSafeInteger) &&
          item.x >= 0 && item.y >= 0 && item.w >= 1 && item.h >= 1 && item.x + item.w <= cols)) return createDashboardLayout()
    }
    return saved
  } catch { return createDashboardLayout() }
}

export function mergeVisibleLayouts(previous: DashboardLayout, updated: Layouts): DashboardLayout {
  const layouts = { ...previous.layouts }
  for (const name of Object.keys(GRID_COLS)) {
    if (!updated[name]) continue
    layouts[name] = previous.layouts[name].map(item => {
      if (previous.hidden.includes(item.i)) return item
      const next = updated[name].find(candidate => candidate.i === item.i)
      // Save geometry only: internal flags must not lock future interactions.
      return next ? { i: next.i, x: next.x, y: next.y, w: next.w, h: next.h } : item
    })
  }
  return { ...previous, layouts }
}
