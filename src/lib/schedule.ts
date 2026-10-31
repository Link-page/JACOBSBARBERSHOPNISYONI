import { barbers, shop, type DayHours } from '@/data/shop'

export type Slot = { time: string; available: boolean; barberIds: string[] }

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

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function fromDayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Combine a day key and "HH:mm" into a local Date. */
export function combine(key: string, time: string) {
  const d = fromDayKey(key)
  const mins = toMinutes(time)
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  return d
}

export const hoursFor = (date: Date): DayHours => shop.hours[date.getDay()]

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Deterministic stand-in for real availability so the UI behaves like a live
 * calendar. Swap this for the booking backend when it exists.
 */
const isTaken = (key: string, barberId: string, time: string) => hash(`${key}|${barberId}|${time}`) % 100 < 42

const LEAD_TIME = 30 // minutes — earliest bookable start from now

export function slotsFor(date: Date, barberId: string, duration: number, now = new Date()): Slot[] {
  const hours = hoursFor(date)
  if (!hours) return []

  const key = dayKey(date)
  const open = toMinutes(hours.open)
  const close = toMinutes(hours.close)
  const earliest = isSameDay(date, now) ? now.getHours() * 60 + now.getMinutes() + LEAD_TIME : -1
  const pool = barberId === 'any' ? barbers.map((b) => b.id) : [barberId]

  const slots: Slot[] = []
  for (let t = open; t + duration <= close; t += shop.slotStep) {
    if (t < earliest) continue
    const time = fromMinutes(t)
    const free = pool.filter((id) => !isTaken(key, id, time))
    slots.push({ time, available: free.length > 0, barberIds: free })
  }
  return slots
}

export function nextAvailable(now: Date, barberId = 'any', duration = 45, horizon = 14) {
  for (let i = 0; i < horizon; i++) {
    const date = addDays(startOfDay(now), i)
    const slot = slotsFor(date, barberId, duration, now).find((s) => s.available)
    if (slot) return { date, time: slot.time, barberId: slot.barberIds[0] }
  }
  return null
}

export function openStatus(now: Date) {
  const mins = now.getHours() * 60 + now.getMinutes()
  const today = hoursFor(now)
  if (today && mins >= toMinutes(today.open) && mins < toMinutes(today.close)) {
    return { open: true, label: 'Open', detail: `Closes at ${today.close}` }
  }
  for (let i = 0; i < 8; i++) {
    const day = addDays(now, i)
    const hours = hoursFor(day)
    if (!hours || (i === 0 && mins >= toMinutes(hours.open))) continue
    const when =
      i === 0 ? '' : i === 1 ? 'tomorrow ' : `${day.toLocaleDateString(shop.locale, { weekday: 'long' })} `
    return { open: false, label: 'Closed', detail: `Opens ${when}at ${hours.open}` }
  }
  return { open: false, label: 'Closed', detail: '' }
}
