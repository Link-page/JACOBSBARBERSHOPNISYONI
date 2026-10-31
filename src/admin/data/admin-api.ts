import type {
  Appointment,
  AppointmentStatus,
  AuthState,
  Barber,
  BusinessSettings,
  Customer,
  CustomerDetail,
  DateRange,
  DayCapacity,
  GalleryItem,
  HistoryEvent,
  NewAppointment,
  OutboxMessage,
  Service,
  Slot,
  StaffRole,
  TimeBlock,
  WaitlistEntry,
} from './types'

/**
 * Everything the admin app needs from a backend. Authorization is enforced by
 * the backend (database policies and functions); the app only mirrors it.
 */
export interface AdminApi {
  /** 'supabase' for the real backend; 'prototype' for the in-memory development stand-in. */
  readonly mode: 'supabase' | 'prototype'

  auth: {
    getState(): Promise<AuthState>
    signIn(email: string, password: string): Promise<void>
    signOut(): Promise<void>
    /** Calls back when the session changes; returns an unsubscribe function. */
    subscribe(onChange: () => void): () => void
  }

  appointments: {
    list(range: DateRange): Promise<Appointment[]>
    create(input: NewAppointment): Promise<Appointment>
    update(id: string, change: { serviceId?: string; notes?: string }): Promise<Appointment>
    reschedule(id: string, startsAt: string, barberId?: string): Promise<Appointment>
    cancel(id: string, reason: string): Promise<Appointment>
    setStatus(id: string, status: Extract<AppointmentStatus, 'completed' | 'no_show'>): Promise<Appointment>
    history(id: string): Promise<HistoryEvent[]>
  }

  schedule: {
    daySlots(serviceId: string, date: string, barberId?: string | null): Promise<Slot[]>
    capacity(date: string): Promise<DayCapacity[]>
    blocks(range: DateRange): Promise<TimeBlock[]>
    addBlock(block: Omit<TimeBlock, 'id'>): Promise<TimeBlock>
    removeBlock(id: string): Promise<void>
  }

  waitlist: {
    list(range: DateRange): Promise<WaitlistEntry[]>
    offer(entryId: string, startsAt: string, barberId: string): Promise<WaitlistEntry>
    remove(entryId: string): Promise<void>
    /** Expires unclaimed offers and passes their slots on. */
    runMaintenance(): Promise<number>
    outbox(): Promise<OutboxMessage[]>
  }

  barbers: {
    list(): Promise<Barber[]>
    save(barber: Omit<Barber, 'id' | 'linkedUserId'> & { id?: string }): Promise<Barber>
    /** Gives a signed-up account a staff role, optionally linked to a barber. */
    setAccountRole(email: string, role: StaffRole | 'customer', barberId: string | null): Promise<void>
  }

  services: {
    list(): Promise<Service[]>
    save(service: Omit<Service, 'id' | 'sortOrder'> & { id?: string }, barberIds: string[]): Promise<Service>
    reorder(ids: string[]): Promise<void>
  }

  customers: {
    search(query: string): Promise<Customer[]>
    get(id: string): Promise<CustomerDetail>
    /** Finds a customer by phone or creates one. */
    upsert(fullName: string, phone: string | null): Promise<Customer>
    update(id: string, change: { fullName: string; phone: string | null }): Promise<Customer>
    addNote(customerId: string, body: string): Promise<void>
  }

  settings: {
    get(): Promise<BusinessSettings>
    save(settings: BusinessSettings): Promise<void>
    gallery(): Promise<GalleryItem[]>
    saveGalleryItem(item: Omit<GalleryItem, 'id'> & { id?: string }): Promise<void>
    removeGalleryItem(id: string): Promise<void>
    /** Uploads an image and returns its public URL. */
    uploadImage(file: File, folder: 'logo' | 'barbers' | 'gallery'): Promise<string>
  }
}
