import type {
  Appointment,
  AvailabilityQuery,
  DayAvailability,
  NewAppointment,
  NextSlot,
  TimeSlot,
  WaitlistReceipt,
  WaitlistRequest,
} from './types'

/**
 * Everything the app needs from the shop's booking system. Two implementations:
 * Supabase (real, per signed-in customer) and an on-device demo. Failures are
 * BookingError (./errors).
 */
export interface BookingApi {
  /** True only when requests reach the shop's server. The UI must not claim delivery otherwise. */
  readonly connected: boolean

  /** One entry per day of `month` (YYYY-MM). */
  getMonthAvailability(month: string, query: AvailabilityQuery): Promise<DayAvailability[]>
  /** Open start times on `date` (YYYY-MM-DD). Empty when the day is full or closed. */
  getDaySlots(date: string, query: AvailabilityQuery): Promise<TimeSlot[]>
  getNextAvailable(query: AvailabilityQuery): Promise<NextSlot | null>

  /** The signed-in customer's own appointments, newest last. */
  listAppointments(): Promise<Appointment[]>
  createAppointment(input: NewAppointment): Promise<Appointment>
  rescheduleAppointment(appointment: Appointment, change: Pick<Appointment, 'barberId' | 'start'>): Promise<Appointment>
  cancelAppointment(id: string): Promise<void>
  /** Confirms attendance (before the deadline). Afterwards only the shop can cancel or move it. */
  confirmAttendance(id: string): Promise<Appointment>

  joinWaitlist(request: WaitlistRequest): Promise<WaitlistReceipt>
}
