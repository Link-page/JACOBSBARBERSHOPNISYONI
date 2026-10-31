import type { SupabaseClient } from '@supabase/supabase-js'

import type { BookingApi } from '../booking-api'
import { toBookingError } from '../errors'
import { barberParam, toAppointment, toDay, toNextSlot, toSlot, type AppointmentRow, type DayRow, type NextRow, type SlotRow } from './mappers'

const appointmentColumns = 'id, service_id, barber_id, starts_at, status, confirmation_status, confirmation_deadline, confirmed_at, cancellation_reason'

/** Unwraps a Supabase result or throws a BookingError the UI can explain. */
function data<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toBookingError(result.error)
  return result.data as T
}

/**
 * The real booking backend: every request runs as the signed-in customer, and
 * the database functions re-check availability, ownership and limits.
 */
export function createSupabaseBookingApi(db: SupabaseClient): BookingApi {
  /** The signed-in account's own customer record (staff may also see others' rows). */
  async function myCustomerId(): Promise<string | null> {
    const { data: session } = await db.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) return null
    const row = data(await db.from('customers').select('id').eq('profile_id', userId).maybeSingle<{ id: string }>())
    return row?.id ?? null
  }

  return {
    connected: true,

    async getMonthAvailability(month, { serviceId, barberId }) {
      const rows = data(await db.rpc('get_month_availability', { p_service: serviceId, p_month: `${month}-01`, p_barber: barberParam(barberId) }))
      return (rows as DayRow[]).map(toDay)
    },

    async getDaySlots(date, { serviceId, barberId }) {
      const rows = data(await db.rpc('get_day_slots', { p_service: serviceId, p_date: date, p_barber: barberParam(barberId) }))
      return (rows as SlotRow[]).map(toSlot)
    },

    async getNextAvailable({ serviceId, barberId }) {
      const rows = data(await db.rpc('get_next_available', { p_service: serviceId, p_barber: barberParam(barberId) }))
      const [first] = rows as NextRow[]
      return first ? toNextSlot(first) : null
    },

    async listAppointments() {
      const customerId = await myCustomerId()
      if (!customerId) return []
      const rows = data(await db.from('appointments').select(appointmentColumns).eq('customer_id', customerId).order('starts_at'))
      return (rows as AppointmentRow[]).map(toAppointment)
    },

    async createAppointment({ serviceId, barberId, start }) {
      const row = data(await db.rpc('book_appointment', { p_service: serviceId, p_starts_at: start, p_barber: barberParam(barberId) }))
      return toAppointment(row as AppointmentRow)
    },

    async rescheduleAppointment(appointment, { barberId, start }) {
      const row = data(await db.rpc('reschedule_appointment', { p_id: appointment.id, p_starts_at: start, p_barber: barberParam(barberId) }))
      return toAppointment(row as AppointmentRow)
    },

    async confirmAttendance(id) {
      return toAppointment(data(await db.rpc('confirm_attendance', { p_id: id })) as AppointmentRow)
    },

    async cancelAppointment(id) {
      data(await db.rpc('cancel_appointment', { p_id: id, p_reason: 'בוטל על ידי הלקוח' }))
    },

    async joinWaitlist(request) {
      const result = data(
        await db.rpc('join_waitlist', { p_service: request.serviceId, p_date: request.date, p_barber: barberParam(request.barberId) }),
      ) as { entry: { id: string; created_at: string }; already_on_list: boolean }
      return { id: result.entry.id, request, createdAt: result.entry.created_at, alreadyOnList: result.already_on_list }
    },
  }
}
