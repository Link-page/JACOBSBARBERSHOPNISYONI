import { dayKey } from '@/lib/date'

import type { Appointment, DayAvailability, NextSlot, TimeSlot } from '../types'

export type AppointmentRow = {
  id: string
  service_id: string
  barber_id: string
  starts_at: string
  status: Appointment['status']
  confirmation_status: Appointment['confirmationStatus']
  confirmation_deadline: string | null
  confirmed_at: string | null
  cancellation_reason: Appointment['cancellationReason']
}
export type DayRow = { day: string; status: DayAvailability['status']; free_slots: number }
export type SlotRow = { starts_at: string; barber_ids: string[] }
export type NextRow = { starts_at: string; barber_id: string }

/** "HH:mm" in the device's time zone (the shop's, Asia/Jerusalem). */
const localTime = (iso: string) => new Date(iso).toTimeString().slice(0, 5)

export const toAppointment = (r: AppointmentRow): Appointment => ({
  id: r.id,
  serviceId: r.service_id,
  barberId: r.barber_id,
  start: new Date(r.starts_at).toISOString(),
  status: r.status,
  confirmationStatus: r.confirmation_status,
  confirmationDeadline: r.confirmation_deadline,
  confirmedAt: r.confirmed_at,
  cancellationReason: r.cancellation_reason,
})

export const toDay = (r: DayRow): DayAvailability => ({ date: r.day, status: r.status, freeSlots: r.free_slots })

export const toSlot = (r: SlotRow): TimeSlot => ({ time: localTime(r.starts_at), barberIds: r.barber_ids })

export const toNextSlot = (r: NextRow): NextSlot => ({ date: dayKey(new Date(r.starts_at)), time: localTime(r.starts_at), barberId: r.barber_id })

/** 'any' means "whoever is free" — the database takes null for that. */
export const barberParam = (barberId: string) => (barberId === 'any' ? null : barberId)
