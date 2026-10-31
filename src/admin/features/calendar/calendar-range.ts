import { addDays, dayKey, fromDayKey } from '@/lib/date'

export type CalendarView = 'day' | 'week' | 'month'

const weekStart = (date: string) => {
  const d = fromDayKey(date)
  return addDays(d, -d.getDay()) // weeks start on Sunday
}

/** The days a view shows around `date` (month = whole weeks covering the month). */
export function visibleDays(view: CalendarView, date: string): string[] {
  if (view === 'day') return [date]
  if (view === 'week') return Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart(date), i)))
  const first = fromDayKey(date.slice(0, 8) + '01')
  const start = addDays(first, -first.getDay())
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const end = addDays(last, 6 - last.getDay())
  const days: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(dayKey(d))
  return days
}

/** Moves one view-length forward (+1) or back (-1). */
export function shiftDate(view: CalendarView, date: string, delta: number) {
  const d = fromDayKey(date)
  if (view === 'day') return dayKey(addDays(d, delta))
  if (view === 'week') return dayKey(addDays(d, 7 * delta))
  return dayKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export function viewTitle(view: CalendarView, date: string) {
  const d = fromDayKey(date)
  if (view === 'day') return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
  if (view === 'month') return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const days = visibleDays('week', date)
  const [first, last] = [fromDayKey(days[0]), fromDayKey(days[6])]
  const month = (x: Date) => x.toLocaleDateString('he-IL', { month: 'long' })
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ב${month(last)} ${last.getFullYear()}`
    : `${first.getDate()} ב${month(first)} – ${last.getDate()} ב${month(last)}`
}
