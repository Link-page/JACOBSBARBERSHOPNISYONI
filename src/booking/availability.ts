import type { DayAvailability, DayStatus, NextSlot, TimeSlot } from '@/api/types'
import { barbers, shop, type DayHours } from '@/data/shop'
import { addDays, daysBetween, dayKey, fromMinutes, isSameDay, startOfDay, toMinutes } from '@/lib/date'

/** How far ahead customers can book. */
export const BOOKING_WINDOW_DAYS = 60
/** Earliest bookable start, in minutes from now. */
export const LEAD_TIME_MINUTES = 30

/** Days a customer can open: available days book normally, full days offer the waiting list. */
export const isSelectableDay = (status?: DayStatus) => status === 'available' || status === 'full'

/** Answers whether a barber already has an appointment starting at `time` on `day`. */
export type IsBooked = (barberId: string, day: string, time: string) => boolean

export const hoursFor = (date: Date): DayHours => shop.hours[date.getDay()]

/** "any" expands to the whole team. */
export const resolveBarbers = (barberId: string) => (barberId === 'any' ? barbers.map((b) => b.id) : [barberId])

/** Every start time the shop could offer on `date` for a service of `duration`, after the lead time. */
export function candidateStarts(date: Date, duration: number, now: Date) {
  const hours = hoursFor(date)
  if (!hours) return []
  const earliest = isSameDay(date, now) ? now.getHours() * 60 + now.getMinutes() + LEAD_TIME_MINUTES : -1
  const starts: string[] = []
  for (let t = toMinutes(hours.open); t + duration <= toMinutes(hours.close); t += shop.slotStep) {
    if (t >= earliest) starts.push(fromMinutes(t))
  }
  return starts
}

/** Open start times on `date`, each with the barbers free at that time. */
export function freeSlots(date: Date, barberIds: string[], duration: number, now: Date, isBooked: IsBooked): TimeSlot[] {
  const day = dayKey(date)
  return candidateStarts(date, duration, now)
    .map((time) => ({ time, barberIds: barberIds.filter((id) => !isBooked(id, day, time)) }))
    .filter((slot) => slot.barberIds.length > 0)
}

/** Classifies a calendar day for the month view. */
export function dayAvailability(
  date: Date,
  barberIds: string[],
  duration: number,
  now: Date,
  isBooked: IsBooked,
): DayAvailability {
  const key = dayKey(date)
  const offset = daysBetween(now, date)
  if (offset < 0) return { date: key, status: 'past', freeSlots: 0 }
  if (offset > BOOKING_WINDOW_DAYS) return { date: key, status: 'unavailable', freeSlots: 0 }
  if (!hoursFor(date)) return { date: key, status: 'closed', freeSlots: 0 }
  // Today, after the last bookable start, behaves like a past day.
  if (candidateStarts(date, duration, now).length === 0) return { date: key, status: 'past', freeSlots: 0 }
  const free = freeSlots(date, barberIds, duration, now, isBooked).length
  return { date: key, status: free > 0 ? 'available' : 'full', freeSlots: free }
}

/** The earliest open slot within the booking window, or null. */
export function firstAvailable(barberIds: string[], duration: number, now: Date, isBooked: IsBooked): NextSlot | null {
  for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
    const date = addDays(startOfDay(now), i)
    const [slot] = freeSlots(date, barberIds, duration, now, isBooked)
    if (slot) return { date: dayKey(date), time: slot.time, barberId: slot.barberIds[0] }
  }
  return null
}
