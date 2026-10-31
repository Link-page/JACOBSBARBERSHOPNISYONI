import { describe, expect, it } from 'vitest'

import { combine } from '@/lib/date'

import { daySlots, dayCapacity, isBookable, type ScheduleData } from './schedule-engine'

const SUNDAY = '2030-01-06' // a Sunday
const now = combine('2030-01-01', '08:00')

function schedule(overrides: Partial<ScheduleData> = {}): ScheduleData {
  return {
    slotStepMinutes: 30,
    leadTimeMinutes: 30,
    bookingWindowDays: 60,
    barbers: [{ id: 'jacob', active: true, sortOrder: 0 }, { id: 'noam', active: true, sortOrder: 1 }],
    duration: (_barber, service) => (service === 'cut' ? 45 : service === 'beard' ? 25 : null),
    hours: [
      { barberId: 'jacob', weekday: 0, start: '09:00', end: '20:00' },
      { barberId: 'noam', weekday: 0, start: '12:00', end: '18:00' },
    ],
    breaks: [{ barberId: 'jacob', weekday: 0, start: '13:00', end: '13:30' }],
    blocks: [],
    appointments: [],
    holds: [],
    ...overrides,
  }
}
const times = (slots: { startsAt: Date }[]) => slots.map((s) => s.startsAt.toTimeString().slice(0, 5))

describe('schedule engine', () => {
  it('keeps services inside working hours and out of breaks', () => {
    const slots = times(daySlots(schedule(), 'cut', SUNDAY, now, 'jacob'))
    expect(slots[0]).toBe('09:00')
    expect(slots).toContain('12:00')
    expect(slots).not.toContain('12:30')
    expect(slots).toContain('13:30')
    expect(slots.at(-1)).toBe('19:00')
  })

  it('prevents overlap with an existing appointment for the same barber only', () => {
    const data = schedule({
      appointments: [{ id: 'a', barberId: 'jacob', status: 'booked', start: combine(SUNDAY, '12:00'), end: combine(SUNDAY, '12:45') }],
    })
    expect(isBookable(data, 'jacob', combine(SUNDAY, '12:30'), combine(SUNDAY, '13:00'))).toBe(false)
    expect(isBookable(data, 'noam', combine(SUNDAY, '12:30'), combine(SUNDAY, '13:15'))).toBe(true)
    expect(isBookable(data, 'jacob', combine(SUNDAY, '12:00'), combine(SUNDAY, '12:45'), { appointmentId: 'a' })).toBe(true)
  })

  it('ignores cancelled appointments', () => {
    const data = schedule({
      appointments: [{ id: 'a', barberId: 'jacob', status: 'cancelled', start: combine(SUNDAY, '10:00'), end: combine(SUNDAY, '10:45') }],
    })
    expect(times(daySlots(data, 'cut', SUNDAY, now, 'jacob'))).toContain('10:00')
  })

  it('honours barber and shop-wide blocks and held waiting-list offers', () => {
    const data = schedule({
      blocks: [
        { barberId: 'jacob', start: combine(SUNDAY, '15:00'), end: combine(SUNDAY, '16:00') },
        { barberId: null, start: combine(SUNDAY, '18:00'), end: combine(SUNDAY, '20:00') },
      ],
      holds: [{ entryId: 'w1', barberId: 'jacob', start: combine(SUNDAY, '10:00'), end: combine(SUNDAY, '10:45') }],
    })
    const slots = times(daySlots(data, 'cut', SUNDAY, now, 'jacob'))
    expect(slots).not.toContain('15:00')
    expect(slots).not.toContain('18:00')
    expect(slots).not.toContain('10:00')
    expect(isBookable(data, 'jacob', combine(SUNDAY, '10:00'), combine(SUNDAY, '10:45'), { entryId: 'w1' })).toBe(true)
  })

  it('merges barbers per start time, in display order', () => {
    const slot = daySlots(schedule(), 'cut', SUNDAY, now).find((s) => s.startsAt.getTime() === combine(SUNDAY, '14:00').getTime())
    expect(slot?.barberIds).toEqual(['jacob', 'noam'])
  })

  it('applies lead time and the booking window', () => {
    const morning = combine(SUNDAY, '09:10')
    expect(times(daySlots(schedule(), 'cut', SUNDAY, morning, 'jacob'))[0]).toBe('10:00')
    expect(daySlots(schedule(), 'cut', '2031-01-05', now)).toEqual([])
  })

  it('counts free capacity per barber', () => {
    const data = schedule({
      appointments: [{ id: 'a', barberId: 'noam', status: 'booked', start: combine(SUNDAY, '12:00'), end: combine(SUNDAY, '13:00') }],
    })
    expect(dayCapacity(data, SUNDAY, ['noam'])).toEqual([{ barberId: 'noam', totalSlots: 12, freeSlots: 10 }])
  })
})
