import { dayKey, fromMonthKey, monthKey } from '@/lib/date'

export type CalendarCell = { key: string; day: number; weekday: number }

/**
 * Cells for a month view. Weeks start on Sunday (as in Israel); `null`
 * entries pad the first week so day 1 lands under its weekday.
 */
export function monthCells(month: string): (CalendarCell | null)[] {
  const first = fromMonthKey(month)
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (CalendarCell | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let day = 1; day <= length; day++) {
    const date = new Date(first.getFullYear(), first.getMonth(), day)
    cells.push({ key: dayKey(date), day, weekday: date.getDay() })
  }
  return cells
}

/** The months a customer may browse: this month through the end of the booking window. */
export function browsableMonths(today: Date, windowDays: number) {
  const last = new Date(today)
  last.setDate(last.getDate() + windowDays)
  return { first: monthKey(today), last: monthKey(last) }
}

export const canGoToMonth = (target: string, range: { first: string; last: string }) =>
  target >= range.first && target <= range.last
