import { addDays, combine, dayKey, fromDayKey, toMinutes } from '@/lib/date'

/**
 * Pure scheduling rules, mirroring the database (supabase/migrations/0003).
 * The database is the authority in production; this engine powers the
 * development prototype and is unit-tested against the same rules.
 * Times are local wall-clock times.
 */

export type WeeklyRange = { barberId: string; weekday: number; start: string; end: string }
export type Interval = { start: Date; end: Date }

export type ScheduleData = {
  slotStepMinutes: number
  leadTimeMinutes: number
  bookingWindowDays: number
  barbers: { id: string; active: boolean; sortOrder: number }[]
  /** Minutes a barber needs for a service, or null if they don't offer it. */
  duration: (barberId: string, serviceId: string) => number | null
  hours: WeeklyRange[]
  breaks: WeeklyRange[]
  /** barberId null = the whole shop. */
  blocks: (Interval & { barberId: string | null })[]
  /** Only active appointments (booked / completed) occupy time. */
  appointments: (Interval & { id: string; barberId: string; status: string })[]
  /** Open waiting-list offers hold their slot. */
  holds: (Interval & { entryId: string; barberId: string })[]
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end
const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes()
const occupies = (status: string) => status === 'booked' || status === 'completed'

/** Whether [start, end) is free for the barber under every rule. */
export function isBookable(
  data: ScheduleData,
  barberId: string,
  start: Date,
  end: Date,
  ignore: { appointmentId?: string; entryId?: string } = {},
) {
  if (end <= start || dayKey(start) !== dayKey(new Date(end.getTime() - 1))) return false
  if (!data.barbers.some((b) => b.id === barberId && b.active)) return false
  const weekday = start.getDay()
  const [from, to] = [minutesOf(start), minutesOf(start) + (end.getTime() - start.getTime()) / 60_000]
  const within = (r: WeeklyRange) => r.barberId === barberId && r.weekday === weekday
  if (!data.hours.some((h) => within(h) && from >= toMinutes(h.start) && to <= toMinutes(h.end))) return false
  if (data.breaks.some((b) => within(b) && toMinutes(b.start) < to && toMinutes(b.end) > from)) return false
  const slot = { start, end }
  if (data.blocks.some((b) => (b.barberId === null || b.barberId === barberId) && overlaps(b, slot))) return false
  if (
    data.appointments.some(
      (a) => a.barberId === barberId && occupies(a.status) && a.id !== ignore.appointmentId && overlaps(a, slot),
    )
  ) {
    return false
  }
  return !data.holds.some((h) => h.barberId === barberId && h.entryId !== ignore.entryId && overlaps(h, slot))
}

/** Grid start times (working start + n × step) where the service fits a barber's hours on `date`. */
export function candidateStarts(data: ScheduleData, serviceId: string, date: string, barberId?: string | null) {
  const weekday = fromDayKey(date).getDay()
  return data.barbers
    .filter((b) => b.active && (!barberId || b.id === barberId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((barber) => {
      const duration = data.duration(barber.id, serviceId)
      if (!duration) return []
      return data.hours
        .filter((h) => h.barberId === barber.id && h.weekday === weekday)
        .flatMap((h) => {
          const starts = []
          for (let t = toMinutes(h.start); t + duration <= toMinutes(h.end); t += data.slotStepMinutes) {
            const start = combine(date, `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
            starts.push({ barberId: barber.id, start, duration })
          }
          return starts
        })
    })
}

/** Open start times on `date`, each with the barbers free then (first = suggested). */
export function daySlots(data: ScheduleData, serviceId: string, date: string, now: Date, barberId?: string | null) {
  const today = dayKey(now)
  if (date < today || date > dayKey(addDays(now, data.bookingWindowDays))) return []
  const earliest = now.getTime() + data.leadTimeMinutes * 60_000
  const byStart = new Map<number, string[]>()
  for (const c of candidateStarts(data, serviceId, date, barberId)) {
    if (c.start.getTime() < earliest) continue
    if (!isBookable(data, c.barberId, c.start, new Date(c.start.getTime() + c.duration * 60_000))) continue
    byStart.set(c.start.getTime(), [...(byStart.get(c.start.getTime()) ?? []), c.barberId])
  }
  return [...byStart.entries()].sort(([a], [b]) => a - b).map(([t, barberIds]) => ({ startsAt: new Date(t), barberIds }))
}

/** Per barber: grid slots in the working day and how many are still free (one step long). */
export function dayCapacity(data: ScheduleData, date: string, barberIds: string[]) {
  const weekday = fromDayKey(date).getDay()
  return barberIds.map((barberId) => {
    let total = 0
    let free = 0
    for (const h of data.hours.filter((r) => r.barberId === barberId && r.weekday === weekday)) {
      for (let t = toMinutes(h.start); t + data.slotStepMinutes <= toMinutes(h.end); t += data.slotStepMinutes) {
        const start = combine(date, `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
        total += 1
        if (isBookable(data, barberId, start, new Date(start.getTime() + data.slotStepMinutes * 60_000))) free += 1
      }
    }
    return { barberId, totalSlots: total, freeSlots: free }
  })
}
