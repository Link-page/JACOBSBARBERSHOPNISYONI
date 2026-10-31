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
 * Everything the app needs from the shop's booking system. A server-backed
 * implementation replaces the on-device one without touching the UI.
 */
export interface BookingApi {
  /** True only when requests reach the shop's server. The UI must not claim delivery otherwise. */
  readonly connected: boolean

  /** One entry per day of `month` (YYYY-MM). */
  getMonthAvailability(month: string, query: AvailabilityQuery): Promise<DayAvailability[]>
  /** Open start times on `date` (YYYY-MM-DD). Empty when the day is full or closed. */
  getDaySlots(date: string, query: AvailabilityQuery): Promise<TimeSlot[]>
  getNextAvailable(query: AvailabilityQuery): Promise<NextSlot | null>

  createAppointment(input: NewAppointment): Promise<Appointment>
  rescheduleAppointment(appointment: Appointment, change: Pick<Appointment, 'barberId' | 'start'>): Promise<Appointment>

  joinWaitlist(request: WaitlistRequest): Promise<WaitlistReceipt>
}
