/** Shapes the admin app works with, independent of the backend behind them. */

export type StaffRole = 'owner' | 'barber'
export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'
export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'removed' | 'expired'

export type StaffSession = {
  userId: string
  email: string
  name: string
  role: StaffRole
  /** The barber chair this account works, if any (the owner may also be a barber). */
  barberId: string | null
}

export type AuthState =
  | { status: 'signed-out' }
  | { status: 'not-staff'; email: string }
  | { status: 'staff'; staff: StaffSession }

export type Appointment = {
  id: string
  customerId: string
  customerName: string
  customerPhone: string | null
  barberId: string
  serviceId: string
  /** ISO timestamps */
  startsAt: string
  endsAt: string
  price: number
  status: AppointmentStatus
  notes: string
}

export type NewAppointment = { customerId: string; barberId: string; serviceId: string; startsAt: string; notes: string }

export type WeeklyRange = { weekday: number; start: string; end: string }

export type Barber = {
  id: string
  name: string
  bio: string
  photoUrl: string | null
  active: boolean
  sortOrder: number
  linkedUserId: string | null
  services: { serviceId: string; durationMinutes: number | null }[]
  hours: WeeklyRange[]
  breaks: WeeklyRange[]
}

export type Service = {
  id: string
  name: string
  description: string
  durationMinutes: number
  price: number
  active: boolean
  sortOrder: number
}

export type Customer = { id: string; fullName: string; phone: string | null; hasAccount: boolean; createdAt: string }
export type CustomerNote = { id: string; body: string; createdAt: string }
export type CustomerDetail = { customer: Customer; appointments: Appointment[]; notes: CustomerNote[] }

export type TimeBlock = { id: string; barberId: string | null; startsAt: string; endsAt: string; reason: string }

export type WaitlistEntry = {
  id: string
  customerId: string
  customerName: string | null
  customerPhone: string | null
  barberId: string | null
  serviceId: string
  date: string
  status: WaitlistStatus
  offeredStartsAt: string | null
  offeredBarberId: string | null
  offerExpiresAt: string | null
  createdAt: string
}

export type OutboxMessage = {
  id: string
  waitlistEntryId: string | null
  channel: 'sms' | 'whatsapp' | 'email'
  status: 'pending' | 'sent' | 'failed'
  message: string
  createdAt: string
}

export type Slot = { startsAt: string; barberIds: string[] }
export type DayCapacity = { barberId: string; totalSlots: number; freeSlots: number }
export type HistoryEvent = { id: string; action: string; actorId: string | null; details: Record<string, unknown>; createdAt: string }

export type BusinessSettings = {
  name: string
  descriptor: string
  logoUrl: string | null
  address: string
  city: string
  phone: string
  whatsapp: string
  instagram: string
  slotStepMinutes: number
  leadTimeMinutes: number
  bookingWindowDays: number
  cancellationNoticeHours: number
  waitlistOfferMinutes: number
  bookingPolicy: string
  cancellationPolicy: string
  /** Default theme of the customer app. */
  appearance: { theme: 'system' | 'light' | 'dark' }
}

export type GalleryItem = { id: string; title: string; category: string; imageUrl: string; active: boolean; sortOrder: number }

export type DateRange = { from: string; to: string }
