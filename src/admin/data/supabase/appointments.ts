import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import type { HistoryEvent } from '../types'
import { dayStart, unwrap } from './client'
import { toAppointment, type AppointmentRow } from './mappers'

const withCustomer = '*, customer:customers(full_name, phone)'

/** Appointments: reads through RLS, every change through a checked database function. */
export const createAppointments = (db: SupabaseClient): AdminApi['appointments'] => {
  /** Re-reads one appointment with its customer after a function call changed it. */
  const fetchOne = async (id: string) =>
    toAppointment(unwrap(await db.from('appointments').select(withCustomer).eq('id', id).single<AppointmentRow>()))

  const call = async (fn: string, args: Record<string, unknown>) => {
    const row = unwrap(await db.rpc(fn, args).single<AppointmentRow>())
    return fetchOne(row.id)
  }

  return {
    async list({ from, to }) {
      const rows = unwrap(
        await db
          .from('appointments')
          .select(withCustomer)
          .gte('starts_at', dayStart(from))
          .lt('starts_at', dayStart(to))
          .order('starts_at')
          .returns<AppointmentRow[]>(),
      )
      return rows.map(toAppointment)
    },

    create: (input) =>
      call('staff_create_appointment', {
        p_customer: input.customerId,
        p_barber: input.barberId,
        p_service: input.serviceId,
        p_starts_at: input.startsAt,
        p_notes: input.notes,
      }),

    update: (id, change) =>
      call('update_appointment', { p_id: id, p_service: change.serviceId ?? null, p_notes: change.notes ?? null }),
    reschedule: (id, startsAt, barberId) =>
      call('reschedule_appointment', { p_id: id, p_starts_at: startsAt, p_barber: barberId ?? null }),
    cancel: (id, reason) => call('cancel_appointment', { p_id: id, p_reason: reason }),
    setStatus: (id, status) => call('set_appointment_status', { p_id: id, p_status: status }),
    confirm: (id) => call('confirm_attendance', { p_id: id }),

    async history(id) {
      type Row = {
        id: number
        action: string
        actor_id: string | null
        details: Record<string, unknown>
        created_at: string
      }
      const rows = unwrap(await db.rpc('get_appointment_history', { p_id: id })) as Row[]
      return rows.map(
        (r): HistoryEvent => ({
          id: String(r.id),
          action: r.action,
          actorId: r.actor_id,
          details: r.details,
          createdAt: r.created_at,
        }),
      )
    },
  }
}
