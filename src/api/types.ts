/** Shapes exchanged with the booking backend. */

export type Appointment = {
  id: string
  serviceId: string
  barberId: string
  /** ISO timestamp of the start time. */
  start: string
  /** completed / no_show are set by the shop after the visit. */
  status: 'booked' | 'cancelled' | 'completed' | 'no_show'
  /** Attendance confirmation (see supabase/migrations/0012_attendance.sql). */
  confirmationStatus: 'pending' | 'confirmed' | 'not_required'
  /** ISO: confirm before this, or the appointment may be cancelled automatically. */
  confirmationDeadline: string | null
  confirmedAt: string | null
  cancellationReason: 'customer' | 'staff' | 'no_confirmation' | 'system' | null
}

export type NewAppointment = Pick<Appointment, 'serviceId' | 'barberId' | 'start'>

/**
 * available — has free slots · full — open but every slot is taken (waiting list)
 * closed — the shop doesn't open · past — over, or too late today
 * unavailable — beyond the booking window
 */
export type DayStatus = 'available' | 'full' | 'closed' | 'past' | 'unavailable'

export type DayAvailability = {
  /** YYYY-MM-DD */
  date: string
  status: DayStatus
  freeSlots: number
}

export type TimeSlot = {
  /** HH:mm */
  time: string
  /** Barbers free at this time; the first is offered when the customer chose "any". */
  barberIds: string[]
}

export type NextSlot = { date: string; time: string; barberId: string }

/** What's being booked: the service, a barber id (or "any") and the service length in minutes. */
export type AvailabilityQuery = { serviceId: string; barberId: string; duration: number }

export type WaitlistRequest = { date: string; barberId: string; serviceId: string }

export type WaitlistReceipt = {
  id: string
  request: WaitlistRequest
  createdAt: string
  /** The customer was already on this list; nothing new was created. */
  alreadyOnList: boolean
}
