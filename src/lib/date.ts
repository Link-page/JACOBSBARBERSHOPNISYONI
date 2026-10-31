/** Date primitives. Days are local calendar days keyed "YYYY-MM-DD"; months "YYYY-MM". */

const pad = (n: number) => String(n).padStart(2, '0')

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

/** Whole days from `from` to `to`, ignoring time of day. */
export const daysBetween = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)

export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function fromDayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** A day key plus "HH:mm" as a local Date. */
export function combine(key: string, time: string) {
  const d = fromDayKey(key)
  const mins = toMinutes(time)
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  return d
}

export const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

export function fromMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export function addMonths(key: string, delta: number) {
  const d = fromMonthKey(key)
  d.setMonth(d.getMonth() + delta)
  return monthKey(d)
}
