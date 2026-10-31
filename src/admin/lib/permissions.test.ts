import { describe, expect, it } from 'vitest'

import type { Barber, StaffSession } from '../data/types'
import { canManageBarber, canManageBusiness, visibleBarbers } from './permissions'

const owner: StaffSession = { userId: 'u1', email: 'o@x', name: 'יעקב', role: 'owner', barberId: 'jacob' }
const barber: StaffSession = { userId: 'u2', email: 'b@x', name: 'נועם', role: 'barber', barberId: 'noam' }
const unlinked: StaffSession = { ...barber, barberId: null }
const chair = (id: string) => ({ id }) as Barber

describe('admin permissions', () => {
  it('owners manage every chair and the business', () => {
    expect(canManageBarber(owner, 'noam')).toBe(true)
    expect(canManageBarber(owner, null)).toBe(true)
    expect(canManageBusiness(owner)).toBe(true)
  })

  it('barbers manage only their own chair', () => {
    expect(canManageBarber(barber, 'noam')).toBe(true)
    expect(canManageBarber(barber, 'jacob')).toBe(false)
    expect(canManageBarber(barber, null)).toBe(false) // shop-wide closures
    expect(canManageBusiness(barber)).toBe(false)
    expect(visibleBarbers(barber, [chair('jacob'), chair('noam')]).map((b) => b.id)).toEqual(['noam'])
  })

  it('a barber account without a chair manages nothing', () => {
    expect(canManageBarber(unlinked, 'noam')).toBe(false)
    expect(visibleBarbers(unlinked, [chair('jacob')])).toEqual([])
  })
})
