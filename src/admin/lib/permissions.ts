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

/** Barbers whose schedule this staff member works with. */
export const visibleBarbers = (staff: StaffSession, barbers: Barber[]) =>
  isOwner(staff) ? barbers : barbers.filter((b) => b.id === staff.barberId)
