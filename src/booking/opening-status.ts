import { addDays, toMinutes } from '@/lib/date'

import { hoursFor } from './availability'

export type OpeningStatus =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string; daysAway: number; day: Date }
  | { open: false; opensAt: null }

/** Whether the shop is open at `now`, and when it next opens if not. */
export function openingStatus(now: Date): OpeningStatus {
  const mins = now.getHours() * 60 + now.getMinutes()
  const today = hoursFor(now)
  if (today && mins >= toMinutes(today.open) && mins < toMinutes(today.close)) {
    return { open: true, closesAt: today.close }
  }
  for (let i = 0; i < 8; i++) {
    const day = addDays(now, i)
    const hours = hoursFor(day)
    if (!hours || (i === 0 && mins >= toMinutes(hours.open))) continue
    return { open: false, opensAt: hours.open, daysAway: i, day }
  }
  return { open: false, opensAt: null }
}
