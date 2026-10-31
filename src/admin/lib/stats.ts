import { dayKey } from '@/lib/date'

import type { Appointment, DayCapacity } from '../data/types'

/**
 * Dashboard figures, computed from appointments the signed-in user may see
 * (the backend already scopes a barber to their own chair).
 */
export function summarize(appointments: Appointment[], now: Date, range: { from: string; to: string }) {
  const today = dayKey(now)
  const inRange = appointments.filter((a) => {
    const day = dayKey(new Date(a.startsAt))
    return day >= range.from && day < range.to
  })
  const completed = inRange.filter((a) => a.status === 'completed')
  return {
    today: appointments.filter((a) => dayKey(new Date(a.startsAt)) === today && a.status !== 'cancelled'),
    upcoming: appointments.filter((a) => a.status === 'booked' && new Date(a.startsAt) > now),
    completed: completed.length,
    cancelled: inRange.filter((a) => a.status === 'cancelled').length,
    noShows: inRange.filter((a) => a.status === 'no_show').length,
    /** Revenue estimate: prices of completed visits only. */
    revenue: completed.reduce((sum, a) => sum + a.price, 0),
  }
}

/** Share of the day's bookable time already taken, 0–1 (null when nobody works). */
export function occupancy(capacity: DayCapacity[]) {
  const total = capacity.reduce((sum, c) => sum + c.totalSlots, 0)
  const free = capacity.reduce((sum, c) => sum + c.freeSlots, 0)
  return total === 0 ? null : (total - free) / total
}

export const freeSlots = (capacity: DayCapacity[]) => capacity.reduce((sum, c) => sum + c.freeSlots, 0)

/** Appointments per day, split by outcome, for a chart. Cancelled visits are excluded. */
export function perDay(appointments: Appointment[], days: string[]) {
  return days.map((date) => {
    const day = appointments.filter((a) => dayKey(new Date(a.startsAt)) === date)
    return {
      date,
      completed: day.filter((a) => a.status === 'completed').length,
      booked: day.filter((a) => a.status === 'booked').length,
      noShow: day.filter((a) => a.status === 'no_show').length,
    }
  })
}
