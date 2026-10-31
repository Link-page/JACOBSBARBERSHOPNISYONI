import type { Appointment } from '@/api/types'

export type { Appointment }

export type Tab = 'home' | 'lookbook' | 'bookings' | 'profile'

export type Appearance = 'system' | 'light' | 'dark'

export type BookingRequest =
  | { mode: 'new'; serviceId?: string; barberId?: string; /** YYYY-MM-DD: open straight at that day's times. */ date?: string }
  | { mode: 'reschedule'; appointmentId: string }

export type LookViewer = { id: string; source: string } | null
