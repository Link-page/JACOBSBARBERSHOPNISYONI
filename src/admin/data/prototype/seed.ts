import { services as menu, shop } from '@/data/shop'
import { addDays, combine, dayKey, fromMinutes, toMinutes } from '@/lib/date'

import type { Barber, BusinessSettings, Customer, Service, TimeBlock, WaitlistEntry } from '../types'

/*
 * DEVELOPMENT PROTOTYPE DATA — invented, in memory only, never persisted.
 * Mirrors the starting state of the real database (one active barber, Jacob)
 * plus a sample history so every screen has something to show.
 */

export const JACOB = 'proto-jacob'
export const NOAM = 'proto-noam'

export type ApptRow = {
  id: string
  customerId: string
  barberId: string
  serviceId: string
  start: Date
  end: Date
  price: number
  status: 'booked' | 'completed' | 'cancelled' | 'no_show'
  notes: string
  confirmationStatus: 'pending' | 'confirmed' | 'not_required'
  confirmedAt: Date | null
}

const hours = (from: string, to: string) =>
  [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: from, end: weekday === 4 ? '21:00' : to })).concat({ weekday: 5, start: '08:00', end: '15:00' })

export const seedServices = (): Service[] =>
  menu.map((s, i) => ({ id: s.id, name: s.name, description: s.description, durationMinutes: s.duration, price: s.price, active: true, sortOrder: i }))

export const seedBarbers = (): Barber[] => [
  {
    id: JACOB,
    name: 'יעקב',
    bio: 'מייסד · ספר ראשי',
    photoUrl: null,
    active: true,
    sortOrder: 0,
    linkedUserId: 'proto-owner',
    linkedCanBroadcast: true,
    whatsapp: '',
    services: menu.map((s) => ({ serviceId: s.id, durationMinutes: null })),
    hours: hours('09:00', '20:00'),
    breaks: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: '13:00', end: '13:30' })),
  },
  {
    id: NOAM,
    name: 'נועם',
    bio: 'מצטרף בקרוב',
    photoUrl: null,
    active: false,
    sortOrder: 1,
    linkedUserId: 'proto-barber',
    linkedCanBroadcast: false,
    whatsapp: '',
    services: menu.slice(0, 4).map((s) => ({ serviceId: s.id, durationMinutes: null })),
    hours: hours('10:00', '19:00'),
    breaks: [],
  },
]

export const seedSettings = (): BusinessSettings => ({
  name: shop.name,
  descriptor: shop.descriptor,
  logoUrl: null,
  address: shop.address,
  city: shop.city,
  phone: shop.phone,
  whatsapp: shop.whatsapp,
  instagram: shop.instagram,
  slotStepMinutes: 30,
  leadTimeMinutes: 30,
  bookingWindowDays: 60,
  cancellationNoticeHours: 3,
  waitlistOfferMinutes: 120,
    confirmationRequestTime: '10:00',
    confirmationDeadlineTime: '20:00',
    autoCancelUnconfirmed: true,
    lateBookingPolicy: 'auto_confirm',
    reminderMinutesBefore: 120,
  bookingPolicy: 'התשלום במספרה.',
  cancellationPolicy: 'אפשר לבטל או לשנות תור עד 3 שעות לפני מועדו.',
  appearance: { theme: 'system' },
})

const names = ['אבי לוי', 'משה כהן', 'יוסי מזרחי', 'דוד פרץ', 'אורי ביטון', 'רון אזולאי', 'עומר דהן', 'איתי אברהם', 'נדב פרידמן', 'גיל שפירא', 'תומר חדד', 'ליאור גבאי', 'אלון סגל', 'שי מלכה']

export const seedCustomers = (now: Date): Customer[] =>
  names.map((fullName, i) => ({
    id: `proto-c${i + 1}`,
    fullName,
    phone: `050-000-${String(1000 + i * 7).slice(-4)}`,
    hasAccount: i % 3 !== 0,
    createdAt: addDays(now, -120 + i * 5).toISOString(),
  }))

/** Deterministic pseudo-random sequence so the prototype looks the same every load. */
function sequence(seed: number) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31
    return x / 2 ** 31
  }
}

/** Fills Jacob's past three weeks and next two with plausible, non-overlapping appointments. */
export function seedAppointments(now: Date, barbers: Barber[], services: Service[], customers: Customer[]): ApptRow[] {
  const random = sequence(7)
  const jacob = barbers[0]
  const today = dayKey(now)
  const fullDay = dayKey(addDays(now, 3))
  const rows: ApptRow[] = []
  for (let offset = -21; offset <= 14; offset++) {
    const date = dayKey(addDays(now, offset))
    const weekday = addDays(now, offset).getDay()
    const day = jacob.hours.find((h) => h.weekday === weekday)
    if (!day) continue
    let t = toMinutes(day.start)
    while (t < toMinutes(day.end)) {
      const service = services[Math.floor(random() * services.length)]
      const lunch = jacob.breaks.find((b) => b.weekday === weekday)
      if (lunch && t + service.durationMinutes > toMinutes(lunch.start) && t < toMinutes(lunch.end)) {
        t = toMinutes(lunch.end)
        continue
      }
      if (t + service.durationMinutes > toMinutes(day.end)) break
      const busy = date === fullDay ? 1 : date === today ? 0.7 : 0.55
      if (random() < busy) {
        const start = combine(date, fromMinutes(t))
        const past = start < now
        const roll = random()
        rows.push({
          id: `proto-a${rows.length + 1}`,
          customerId: customers[Math.floor(random() * customers.length)].id,
          barberId: jacob.id,
          serviceId: service.id,
          start,
          end: new Date(start.getTime() + service.durationMinutes * 60_000),
          price: service.price,
          status: past ? (roll < 0.08 ? 'no_show' : roll < 0.18 ? 'cancelled' : 'completed') : date !== fullDay && roll < 0.08 ? 'cancelled' : 'booked',
          notes: '',
          // Future bookings show a mix of attendance states, so the screens can be exercised.
          confirmationStatus: past ? 'not_required' : roll < 0.45 ? 'confirmed' : 'pending',
          confirmedAt: !past && roll < 0.45 ? now : null,
        })
        t += Math.ceil(service.durationMinutes / 30) * 30
      } else {
        t += 30
      }
    }
  }
  return rows
}

export function seedBlocks(now: Date): TimeBlock[] {
  const holiday = dayKey(addDays(now, 12))
  const meeting = dayKey(addDays(now, 2))
  return [
    { id: 'proto-b1', barberId: null, startsAt: combine(holiday, '00:00').toISOString(), endsAt: combine(dayKey(addDays(now, 13)), '00:00').toISOString(), reason: 'חג — המספרה סגורה' },
    { id: 'proto-b2', barberId: JACOB, startsAt: combine(meeting, '16:00').toISOString(), endsAt: combine(meeting, '18:00').toISOString(), reason: 'פגישה עם ספק' },
  ]
}

export function seedWaitlist(now: Date, customers: Customer[], services: Service[]): WaitlistEntry[] {
  const date = dayKey(addDays(now, 3))
  return [0, 1, 2].map((i) => ({
    id: `proto-w${i + 1}`,
    customerId: customers[i + 4].id,
    customerName: customers[i + 4].fullName,
    customerPhone: customers[i + 4].phone,
    barberId: i === 1 ? null : JACOB,
    serviceId: services[i].id,
    date,
    status: 'waiting',
    offeredStartsAt: null,
    offeredBarberId: null,
    offerExpiresAt: null,
    createdAt: addDays(now, -2 + i).toISOString(),
  }))
}
