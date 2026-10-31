/** Shapes exchanged with the booking backend. */

export type Appointment = {
  id: string
  serviceId: string
  barberId: string
  /** ISO timestamp of the start time. */
  start: string
  status: 'booked' | 'cancelled'
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

/** What's being booked: a barber id (or "any") and the service length in minutes. */
export type AvailabilityQuery = { barberId: string; duration: number }

export type WaitlistRequest = { date: string; barberId: string; serviceId: string }

export type WaitlistReceipt = {
  id: string
  request: WaitlistRequest
  createdAt: string
  /** The customer was already on this list; nothing new was created. */
  alreadyOnList: boolean
}
