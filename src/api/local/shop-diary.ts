import type { IsBooked } from '@/booking/availability'

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A deterministic stand-in for the shop's appointment diary, so the demo
 * behaves like a real calendar: quiet days, busy days, a barber who is fully
 * booked, and the occasional day when the whole shop is full.
 */
export const isBooked: IsBooked = (barberId, day, time) => {
  if (hash(`shop|${day}`) % 100 < 7) return true // whole shop fully booked
  const load = hash(`${day}|${barberId}`) % 100
  if (load < 12) return true // this barber is fully booked
  return hash(`${day}|${barberId}|${time}`) % 100 < 22 + (load % 48)
}
