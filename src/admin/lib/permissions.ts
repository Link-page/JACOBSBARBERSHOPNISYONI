import type { Barber, StaffSession } from '../data/types'

/*
 * What the interface offers each role. These mirror the database rules so
 * people aren't shown actions they can't take — they are not the security
 * boundary; the database is.
 */

export const isOwner = (staff: StaffSession) => staff.role === 'owner'

/** Owners manage every chair; a barber manages only their own. */
export const canManageBarber = (staff: StaffSession, barberId: string | null) =>
  isOwner(staff) || (barberId !== null && staff.barberId === barberId)

/** Services, prices, hours, team, settings and shop-wide closures are owner-only. */
export const canManageBusiness = isOwner

/** Messages to customers: the owner, or a barber the owner authorised (the database checks again). */
export const canBroadcast = (staff: StaffSession) => isOwner(staff) || staff.canBroadcast

/** Whether a section of the admin is offered to this staff member. */
export const canSeeRoute = (route: { ownerOnly?: boolean; broadcastOnly?: boolean }, staff: StaffSession) =>
  (!route.ownerOnly || isOwner(staff)) && (!route.broadcastOnly || canBroadcast(staff))

/** Barbers whose schedule this staff member works with. */
export const visibleBarbers = (staff: StaffSession, barbers: Barber[]) =>
  isOwner(staff) ? barbers : barbers.filter((b) => b.id === staff.barberId)
