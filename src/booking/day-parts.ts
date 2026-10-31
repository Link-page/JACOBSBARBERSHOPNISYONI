import type { TimeSlot } from '@/api/types'
import { toMinutes } from '@/lib/date'

export type DayPartId = 'morning' | 'afternoon' | 'evening'

const bounds: Record<DayPartId, [number, number]> = {
  morning: [0, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 24 * 60],
}

/** Splits a day's slots into morning / afternoon / evening, dropping empty parts. */
export function groupByDayPart(slots: TimeSlot[]) {
  return (Object.keys(bounds) as DayPartId[])
    .map((id) => {
      const [from, to] = bounds[id]
      return { id, slots: slots.filter((s) => toMinutes(s.time) >= from && toMinutes(s.time) < to) }
    })
    .filter((part) => part.slots.length > 0)
}
