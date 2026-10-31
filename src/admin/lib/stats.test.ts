import { describe, expect, it } from 'vitest'

import type { Appointment } from '../data/types'
import { occupancy, perDay, summarize } from './stats'

const at = (iso: string, status: Appointment['status'], price = 100): Appointment => ({
  id: iso + status,
  customerId: 'c',
  customerName: 'לקוח',
  customerPhone: null,
  barberId: 'b',
  serviceId: 's',
  startsAt: new Date(iso).toISOString(),
  endsAt: new Date(iso).toISOString(),
  price,
  status,
  notes: '',
})

const now = new Date('2030-01-08T12:00:00')
const list = [
  at('2030-01-06T10:00:00', 'completed', 90),
  at('2030-01-07T10:00:00', 'completed', 140),
  at('2030-01-07T11:00:00', 'no_show'),
  at('2030-01-08T09:00:00', 'completed', 60),
  at('2030-01-08T15:00:00', 'booked'),
  at('2030-01-08T16:00:00', 'cancelled'),
  at('2030-01-09T10:00:00', 'booked'),
]

describe('dashboard statistics', () => {
  it('summarises the period', () => {
    const s = summarize(list, now, { from: '2030-01-06', to: '2030-01-13' })
    expect(s.today).toHaveLength(2) // cancelled excluded
    expect(s.upcoming).toHaveLength(2)
    expect(s.completed).toBe(3)
    expect(s.cancelled).toBe(1)
    expect(s.noShows).toBe(1)
    expect(s.revenue).toBe(290) // completed only
  })

  it('computes occupancy from capacity', () => {
    expect(occupancy([{ barberId: 'b', totalSlots: 20, freeSlots: 5 }])).toBe(0.75)
    expect(occupancy([])).toBeNull()
  })

  it('counts per day without cancellations', () => {
    expect(perDay(list, ['2030-01-08'])).toEqual([{ date: '2030-01-08', completed: 1, booked: 1, noShow: 0 }])
  })
})
