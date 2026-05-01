// US NYSE market holidays (YYYY-MM-DD). When a holiday falls on Saturday the
// market closes the preceding Friday; on Sunday it closes the following Monday.
const HOLIDAYS_BY_YEAR: Record<number, string[]> = {
  2024: [
    '2024-01-01', // New Year's Day
    '2024-01-15', // MLK Jr. Day
    '2024-02-19', // Presidents' Day
    '2024-03-29', // Good Friday
    '2024-05-27', // Memorial Day
    '2024-06-19', // Juneteenth
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-11-28', // Thanksgiving
    '2024-12-25', // Christmas
  ],
  2025: [
    '2025-01-01', // New Year's Day
    '2025-01-09', // National Day of Mourning (Jimmy Carter)
    '2025-01-20', // MLK Jr. Day
    '2025-02-17', // Presidents' Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-06-19', // Juneteenth
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving
    '2025-12-25', // Christmas
  ],
  2026: [
    '2026-01-01', // New Year's Day
    '2026-01-19', // MLK Jr. Day
    '2026-02-16', // Presidents' Day
    '2026-04-03', // Good Friday
    '2026-05-25', // Memorial Day
    '2026-06-19', // Juneteenth
    '2026-07-03', // Independence Day (observed – Jul 4 falls on Saturday)
    '2026-09-07', // Labor Day
    '2026-11-26', // Thanksgiving
    '2026-12-25', // Christmas
  ],
  2027: [
    '2027-01-01', // New Year's Day
    '2027-01-18', // MLK Jr. Day
    '2027-02-15', // Presidents' Day
    '2027-03-26', // Good Friday
    '2027-05-31', // Memorial Day
    '2027-06-18', // Juneteenth (observed – Jun 19 falls on Saturday)
    '2027-07-05', // Independence Day (observed – Jul 4 falls on Sunday)
    '2027-09-06', // Labor Day
    '2027-11-25', // Thanksgiving
    '2027-12-24', // Christmas (observed – Dec 25 falls on Saturday)
  ],
}

const HOLIDAY_SETS: Map<number, Set<string>> = new Map(
  Object.entries(HOLIDAYS_BY_YEAR).map(([year, dates]) => [
    Number(year),
    new Set(dates),
  ])
)

export function isMarketHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10)
  return HOLIDAY_SETS.get(year)?.has(dateStr) ?? false
}

export function isTradingDay(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay() // 0=Sun … 6=Sat
  if (dow === 0 || dow === 6) return false
  return !isMarketHoliday(dateStr)
}

// Count Mon–Fri non-holiday days between startStr and endStr (inclusive).
export function countTradingDays(startStr: string, endStr: string): number {
  const end = new Date(endStr + 'T12:00:00Z')
  const current = new Date(startStr + 'T12:00:00Z')
  let count = 0
  while (current <= end) {
    const iso = current.toISOString().slice(0, 10)
    if (isTradingDay(iso)) count++
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return count
}
