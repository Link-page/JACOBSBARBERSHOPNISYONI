import type { Appointment, Barber, BusinessSettings, Customer, Service, TimeBlock, WaitlistEntry } from '../types'

/* Row shapes as returned by PostgREST, and their mapping to admin types. */

type CustomerJoin = { full_name: string; phone: string | null } | null

export type AppointmentRow = {
  id: string
  customer_id: string
  barber_id: string
  service_id: string
  starts_at: string
  ends_at: string
  price: string | number
  status: Appointment['status']
  notes: string
  confirmation_status: Appointment['confirmationStatus']
  confirmation_deadline: string | null
  confirmed_at: string | null
  confirmed_by: Appointment['confirmedBy']
  cancellation_reason: Appointment['cancellationReason']
  customer?: CustomerJoin
}

export const toAppointment = (r: AppointmentRow): Appointment => ({
  id: r.id,
  customerId: r.customer_id,
  customerName: r.customer?.full_name ?? 'לקוח',
  customerPhone: r.customer?.phone ?? null,
  barberId: r.barber_id,
  serviceId: r.service_id,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  price: Number(r.price),
  status: r.status,
  notes: r.notes,
  confirmationStatus: r.confirmation_status ?? 'not_required',
  confirmationDeadline: r.confirmation_deadline ?? null,
  confirmedAt: r.confirmed_at ?? null,
  confirmedBy: r.confirmed_by ?? null,
  cancellationReason: r.cancellation_reason ?? null,
})

const hhmm = (time: string) => time.slice(0, 5)

export type BarberRow = {
  id: string
  name: string
  bio: string
  photo_path: string | null
  whatsapp: string
  active: boolean
  sort_order: number
  user_id: string | null
  barber_services: { service_id: string; duration_minutes: number | null }[]
  working_hours: { weekday: number; start_time: string; end_time: string }[]
  breaks: { weekday: number; start_time: string; end_time: string }[]
}

/** `canBroadcast`: the linked account's permission to message customers (read separately; staff only). */
export const toBarber = (r: BarberRow, canBroadcast = false): Barber => ({
  id: r.id,
  name: r.name,
  bio: r.bio,
  photoUrl: r.photo_path,
  active: r.active,
  sortOrder: r.sort_order,
  linkedUserId: r.user_id,
  linkedCanBroadcast: r.user_id !== null && canBroadcast,
  whatsapp: r.whatsapp ?? '',
  services: r.barber_services.map((s) => ({ serviceId: s.service_id, durationMinutes: s.duration_minutes })),
  hours: r.working_hours.map((h) => ({ weekday: h.weekday, start: hhmm(h.start_time), end: hhmm(h.end_time) })),
  breaks: r.breaks.map((h) => ({ weekday: h.weekday, start: hhmm(h.start_time), end: hhmm(h.end_time) })),
})

export type ServiceRow = {
  id: string
  name: string
  description: string
  duration_minutes: number
  price: string | number
  active: boolean
  sort_order: number
}

export const toService = (r: ServiceRow): Service => ({
  id: r.id,
  name: r.name,
  description: r.description,
  durationMinutes: r.duration_minutes,
  price: Number(r.price),
  active: r.active,
  sortOrder: r.sort_order,
})

export type CustomerRow = { id: string; full_name: string; phone: string | null; profile_id: string | null; created_at: string }

export const toCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  fullName: r.full_name,
  phone: r.phone,
  hasAccount: r.profile_id !== null,
  createdAt: r.created_at,
})

export type BlockRow = { id: string; barber_id: string | null; starts_at: string; ends_at: string; reason: string }

export const toBlock = (r: BlockRow): TimeBlock => ({
  id: r.id,
  barberId: r.barber_id,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  reason: r.reason,
})

export type WaitlistRow = {
  id: string
  customer_id: string
  barber_id: string | null
  service_id: string
  wanted_date: string
  status: WaitlistEntry['status']
  offered_starts_at: string | null
  offered_barber_id: string | null
  offer_expires_at: string | null
  created_at: string
  customer?: CustomerJoin
}

export const toWaitlistEntry = (r: WaitlistRow): WaitlistEntry => ({
  id: r.id,
  customerId: r.customer_id,
  customerName: r.customer?.full_name ?? null,
  customerPhone: r.customer?.phone ?? null,
  barberId: r.barber_id,
  serviceId: r.service_id,
  date: r.wanted_date,
  status: r.status,
  offeredStartsAt: r.offered_starts_at,
  offeredBarberId: r.offered_barber_id,
  offerExpiresAt: r.offer_expires_at,
  createdAt: r.created_at,
})

export type SettingsRow = {
  name: string
  descriptor: string
  logo_path: string | null
  address: string
  city: string
  phone: string
  whatsapp: string
  instagram: string
  slot_step_minutes: number
  lead_time_minutes: number
  booking_window_days: number
  cancellation_notice_hours: number
  waitlist_offer_minutes: number
  booking_policy: string
  confirmation_request_time: string
  confirmation_deadline_time: string
  auto_cancel_unconfirmed: boolean
  late_booking_policy: BusinessSettings['lateBookingPolicy']
  reminder_minutes_before: number
  cancellation_policy: string
  appearance: { theme?: BusinessSettings['appearance']['theme'] }
}

export const toSettings = (r: SettingsRow): BusinessSettings => ({
  name: r.name,
  descriptor: r.descriptor,
  logoUrl: r.logo_path,
  address: r.address,
  city: r.city,
  phone: r.phone,
  whatsapp: r.whatsapp,
  instagram: r.instagram,
  slotStepMinutes: r.slot_step_minutes,
  leadTimeMinutes: r.lead_time_minutes,
  bookingWindowDays: r.booking_window_days,
  cancellationNoticeHours: r.cancellation_notice_hours,
  waitlistOfferMinutes: r.waitlist_offer_minutes,
  bookingPolicy: r.booking_policy,
  confirmationRequestTime: hhmm(r.confirmation_request_time ?? '10:00'),
  confirmationDeadlineTime: hhmm(r.confirmation_deadline_time ?? '20:00'),
  autoCancelUnconfirmed: r.auto_cancel_unconfirmed ?? true,
  lateBookingPolicy: r.late_booking_policy ?? 'auto_confirm',
  reminderMinutesBefore: r.reminder_minutes_before ?? 120,
  cancellationPolicy: r.cancellation_policy,
  appearance: { theme: r.appearance?.theme ?? 'system' },
})

export const fromSettings = (s: BusinessSettings): Omit<SettingsRow, never> => ({
  name: s.name,
  descriptor: s.descriptor,
  logo_path: s.logoUrl,
  address: s.address,
  city: s.city,
  phone: s.phone,
  whatsapp: s.whatsapp,
  instagram: s.instagram,
  slot_step_minutes: s.slotStepMinutes,
  lead_time_minutes: s.leadTimeMinutes,
  booking_window_days: s.bookingWindowDays,
  cancellation_notice_hours: s.cancellationNoticeHours,
  waitlist_offer_minutes: s.waitlistOfferMinutes,
  booking_policy: s.bookingPolicy,
  confirmation_request_time: s.confirmationRequestTime,
  confirmation_deadline_time: s.confirmationDeadlineTime,
  auto_cancel_unconfirmed: s.autoCancelUnconfirmed,
  late_booking_policy: s.lateBookingPolicy,
  reminder_minutes_before: s.reminderMinutesBefore,
  cancellation_policy: s.cancellationPolicy,
  appearance: s.appearance,
})
