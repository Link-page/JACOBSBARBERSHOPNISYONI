import type { Appointment } from '@/api'

/**
 * What the customer sees about attendance for an upcoming appointment:
 *   needs-confirmation — confirm before `deadline`
 *   closed             — the deadline passed unconfirmed (the shop may cancel it)
 *   confirmed          — locked: cancelling goes through the shop (WhatsApp)
 *   none               — confirmation isn't required
 */
export type AttendanceView =
  | { kind: 'needs-confirmation'; deadline: Date }
  | { kind: 'closed' }
  | { kind: 'confirmed'; at: Date | null }
  | { kind: 'none' }

export function attendanceView(a: Pick<Appointment, 'confirmationStatus' | 'confirmationDeadline' | 'confirmedAt'>, now: Date): AttendanceView {
  if (a.confirmationStatus === 'confirmed') return { kind: 'confirmed', at: a.confirmedAt ? new Date(a.confirmedAt) : null }
  if (a.confirmationStatus === 'pending' && a.confirmationDeadline) {
    const deadline = new Date(a.confirmationDeadline)
    return deadline > now ? { kind: 'needs-confirmation', deadline } : { kind: 'closed' }
  }
  return { kind: 'none' }
}

/** Customers may cancel or move only while attendance isn't confirmed (the database enforces it too). */
export const canSelfManage = (view: AttendanceView) => view.kind !== 'confirmed'
