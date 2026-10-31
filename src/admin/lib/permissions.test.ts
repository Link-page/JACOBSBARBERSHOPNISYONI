import { describe, expect, it } from 'vitest'

import type { Barber, StaffSession } from '../data/types'
import { canBroadcast, canManageBarber, canManageBusiness, canSeeRoute, visibleBarbers } from './permissions'

const owner: StaffSession = { userId: 'u1', email: 'o@x', name: 'יעקב', role: 'owner', barberId: 'jacob', canBroadcast: true }
const barber: StaffSession = { userId: 'u2', email: 'b@x', name: 'נועם', role: 'barber', barberId: 'noam', canBroadcast: false }
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

  it('only the owner, or a barber the owner authorised, sees the notifications section', () => {
    const authorised = { ...barber, canBroadcast: true }
    const notifications = { broadcastOnly: true }
    expect(canBroadcast(owner)).toBe(true)
    expect(canBroadcast({ ...owner, canBroadcast: false })).toBe(true) // the owner always may
    expect(canBroadcast(barber)).toBe(false)
    expect(canSeeRoute(notifications, barber)).toBe(false)
    expect(canSeeRoute(notifications, authorised)).toBe(true)
    // Authorisation to send messages doesn't open owner-only sections.
    expect(canSeeRoute({ ownerOnly: true }, authorised)).toBe(false)
    expect(canSeeRoute({}, barber)).toBe(true)
  })
})
