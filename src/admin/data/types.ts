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
  /** May send messages to customers (always true for the owner). */
  canBroadcast: boolean
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
  /** Attendance confirmation (0012_attendance.sql). */
  confirmationStatus: 'pending' | 'confirmed' | 'not_required'
  confirmationDeadline: string | null
  confirmedAt: string | null
  confirmedBy: 'customer' | 'staff' | 'booking' | null
  cancellationReason: 'customer' | 'staff' | 'no_confirmation' | 'system' | null
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
  /** Whether the linked staff account may send messages to customers. */
  linkedCanBroadcast: boolean
  /** WhatsApp in international digits (e.g. 972541234567); '' = the shop's number. */
  whatsapp: string
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
  /** Attendance confirmation policy (times are HH:MM, the day before, Israel time). */
  confirmationRequestTime: string
  confirmationDeadlineTime: string
  autoCancelUnconfirmed: boolean
  lateBookingPolicy: 'auto_confirm' | 'exempt'
  reminderMinutesBefore: number
  bookingPolicy: string
  cancellationPolicy: string
  /** Default theme of the customer app. */
  appearance: { theme: 'system' | 'light' | 'dark' }
}

export type GalleryItem = { id: string; title: string; category: string; imageUrl: string; active: boolean; sortOrder: number }

export type DateRange = { from: string; to: string }

export type BroadcastAudience = 'opted_in' | 'upcoming'

export type BroadcastInput = {
  title: string
  body: string
  audience: BroadcastAudience
  /** In-app link ('?go=…'), or null. */
  link: string | null
  /** One per draft: a double submit returns the first send. */
  idempotencyKey: string
}

export type BroadcastResult = { id: string; recipients: number; duplicate: boolean }

/** A sent message with counts. "Accepted" = taken by a push service, not proof of display. */
export type BroadcastRecord = {
  id: string
  title: string
  body: string
  audience: BroadcastAudience
  createdAt: string
  senderName: string
  recipients: number
  pushAccepted: number
  pushFailed: number
  pushPending: number
}
