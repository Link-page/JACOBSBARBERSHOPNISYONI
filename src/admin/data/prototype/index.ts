import { dayCapacity, daySlots, isBookable, type ScheduleData } from '@/booking/schedule-engine'
import { dayKey } from '@/lib/date'
import { newId } from '@/lib/id'

import type { AdminApi } from '../admin-api'
import { AdminError } from '../errors'
import type { Appointment, BroadcastRecord, HistoryEvent, StaffSession, TimeBlock } from '../types'
import { canManageBarber, isOwner } from '../../lib/permissions'
import * as seed from './seed'

/*
 * DEVELOPMENT PROTOTYPE BACKEND — in-memory, resets on reload, never shipped
 * in production builds (see src/admin/main.tsx). It applies the same rules as
 * the database so the interface can be exercised before Supabase is connected.
 */

type Role = 'owner' | 'barber'

const sessions: Record<Role, StaffSession> = {
  owner: { userId: 'proto-owner', email: 'owner@prototype.local', name: 'יעקב', role: 'owner', barberId: seed.JACOB, canBroadcast: true },
  barber: { userId: 'proto-barber', email: 'barber@prototype.local', name: 'נועם', role: 'barber', barberId: seed.NOAM, canBroadcast: false },
}

export function createPrototypeApi() {
  const now = () => new Date()
  const services = seed.seedServices()
  const barbers = seed.seedBarbers()
  const customers = seed.seedCustomers(now())
  const state = {
    role: 'owner' as Role,
    signedIn: true,
    settings: seed.seedSettings(),
    barbers,
    services,
    customers,
    notes: [] as { id: string; customerId: string; body: string; createdAt: string }[],
    appointments: seed.seedAppointments(now(), barbers, services, customers),
    blocks: seed.seedBlocks(now()),
    waitlist: seed.seedWaitlist(now(), customers, services),
    broadcasts: [] as (BroadcastRecord & { key: string })[],
    history: [] as (HistoryEvent & { entityId: string })[],
    gallery: [] as { id: string; title: string; category: string; imageUrl: string; active: boolean; sortOrder: number }[],
  }
  const listeners = new Set<() => void>()

  /** Simulated network latency, so loading states are exercised. */
  const settle = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), 140))
  const fail = (code: string): never => {
    throw new AdminError(code)
  }
  const staff = () => (state.signedIn ? sessions[state.role] : fail('forbidden'))
  const requireBarber = (barberId: string | null) => canManageBarber(staff(), barberId) || fail('forbidden')
  const requireOwner = () => isOwner(staff()) || fail('forbidden')
  const record = (entityId: string, action: string, details: Record<string, unknown> = {}) =>
    state.history.push({ id: newId(), entityId, action, actorId: staff().userId, details, createdAt: now().toISOString() })

  const durationOf = (barberId: string, serviceId: string) => {
    const barber = state.barbers.find((b) => b.id === barberId)
    const service = state.services.find((s) => s.id === serviceId && s.active)
    const offer = barber?.services.find((s) => s.serviceId === serviceId)
    return service && offer ? (offer.durationMinutes ?? service.durationMinutes) : null
  }

  const schedule = (): ScheduleData => ({
    slotStepMinutes: state.settings.slotStepMinutes,
    leadTimeMinutes: state.settings.leadTimeMinutes,
    bookingWindowDays: state.settings.bookingWindowDays,
    barbers: state.barbers.map((b) => ({ id: b.id, active: b.active, sortOrder: b.sortOrder })),
    duration: durationOf,
    hours: state.barbers.flatMap((b) => b.hours.map((h) => ({ ...h, barberId: b.id }))),
    breaks: state.barbers.flatMap((b) => b.breaks.map((h) => ({ ...h, barberId: b.id }))),
    blocks: state.blocks.map((b) => ({ barberId: b.barberId, start: new Date(b.startsAt), end: new Date(b.endsAt) })),
    appointments: state.appointments.map((a) => ({ id: a.id, barberId: a.barberId, status: a.status, start: a.start, end: a.end })),
    holds: state.waitlist
      .filter((w) => w.status === 'offered' && w.offerExpiresAt && new Date(w.offerExpiresAt) > now())
      .map((w) => {
        const start = new Date(w.offeredStartsAt!)
        return { entryId: w.id, barberId: w.offeredBarberId!, start, end: new Date(start.getTime() + (durationOf(w.offeredBarberId!, w.serviceId) ?? 0) * 60_000) }
      }),
  })

  const toAppointment = (a: seed.ApptRow): Appointment => {
    const customer = state.customers.find((c) => c.id === a.customerId)
    return {
      id: a.id,
      customerId: a.customerId,
      customerName: customer?.fullName ?? 'לקוח',
      customerPhone: customer?.phone ?? null,
      barberId: a.barberId,
      serviceId: a.serviceId,
      startsAt: a.start.toISOString(),
      endsAt: a.end.toISOString(),
      price: a.price,
      status: a.status,
      notes: a.notes,
      confirmationStatus: a.confirmationStatus,
      // The day before at 20:00, as the database plans it.
      confirmationDeadline: a.confirmationStatus === 'pending' ? new Date(new Date(a.start).setHours(20, 0, 0, 0) - 86_400_000).toISOString() : null,
      confirmedAt: a.confirmedAt?.toISOString() ?? null,
      confirmedBy: a.confirmedAt ? 'customer' : null,
      cancellationReason: a.status === 'cancelled' ? 'staff' : null,
    }
  }
  const findAppointment = (id: string) => state.appointments.find((a) => a.id === id) ?? fail('not_found')

  const visibleCustomerIds = () => {
    const s = staff()
    if (isOwner(s)) return null
    return new Set(state.appointments.filter((a) => a.barberId === s.barberId).map((a) => a.customerId))
  }

  const api: AdminApi = {
    mode: 'prototype',

    auth: {
      getState: () => settle(state.signedIn ? { status: 'staff' as const, staff: sessions[state.role] } : { status: 'signed-out' as const }),
      signIn: async () => {
        state.signedIn = true
        listeners.forEach((l) => l())
      },
      signOut: async () => {
        state.signedIn = false
        listeners.forEach((l) => l())
      },
      subscribe: (onChange) => {
        listeners.add(onChange)
        return () => listeners.delete(onChange)
      },
    },

    appointments: {
      list: ({ from, to }) =>
        settle(
          state.appointments
            .filter((a) => dayKey(a.start) >= from && dayKey(a.start) < to && canManageBarber(staff(), a.barberId))
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map(toAppointment),
        ),

      async create(input) {
        requireBarber(input.barberId)
        const duration = durationOf(input.barberId, input.serviceId) ?? fail('service_not_offered')
        const start = new Date(input.startsAt)
        const end = new Date(start.getTime() + duration * 60_000)
        if (!isBookable(schedule(), input.barberId, start, end)) fail('slot_unavailable')
        const row: seed.ApptRow = {
          id: newId(),
          customerId: input.customerId,
          barberId: input.barberId,
          serviceId: input.serviceId,
          start,
          end,
          price: state.services.find((s) => s.id === input.serviceId)!.price,
          status: 'booked',
          notes: input.notes,
          // Staff bookings in the prototype are walk-ins: no app to confirm in.
          confirmationStatus: 'not_required',
          confirmedAt: null,
        }
        state.appointments.push(row)
        record(row.id, 'insert')
        return settle(toAppointment(row))
      },

      async update(id, change) {
        const a = findAppointment(id)
        requireBarber(a.barberId)
        if (change.serviceId && change.serviceId !== a.serviceId) {
          const duration = durationOf(a.barberId, change.serviceId) ?? fail('service_not_offered')
          const end = new Date(a.start.getTime() + duration * 60_000)
          if (!isBookable(schedule(), a.barberId, a.start, end, { appointmentId: id })) fail('slot_unavailable')
          Object.assign(a, { serviceId: change.serviceId, end, price: state.services.find((s) => s.id === change.serviceId)!.price })
        }
        if (change.notes !== undefined) a.notes = change.notes
        record(id, 'update', change)
        return settle(toAppointment(a))
      },

      async reschedule(id, startsAt, barberId) {
        const a = findAppointment(id)
        const target = barberId ?? a.barberId
        requireBarber(a.barberId)
        requireBarber(target)
        if (a.status !== 'booked') fail('invalid_status')
        const duration = durationOf(target, a.serviceId) ?? fail('service_not_offered')
        const start = new Date(startsAt)
        const end = new Date(start.getTime() + duration * 60_000)
        if (!isBookable(schedule(), target, start, end, { appointmentId: id })) fail('slot_unavailable')
        Object.assign(a, { barberId: target, start, end })
        record(id, 'update', { starts_at: startsAt })
        return settle(toAppointment(a))
      },

      async cancel(id, reason) {
        const a = findAppointment(id)
        requireBarber(a.barberId)
        if (a.status !== 'booked') fail('invalid_status')
        a.status = 'cancelled'
        if (reason.trim()) a.notes = `${a.notes}\nביטול: ${reason.trim()}`.trim()
        record(id, 'update', { status: 'cancelled' })
        return settle(toAppointment(a))
      },

      async setStatus(id, status) {
        const a = findAppointment(id)
        requireBarber(a.barberId)
        if (a.status === 'cancelled') fail('invalid_status')
        a.status = status
        record(id, 'update', { status })
        return settle(toAppointment(a))
      },

      async confirm(id) {
        const a = findAppointment(id)
        requireBarber(a.barberId)
        if (a.status !== 'booked') fail('invalid_status')
        Object.assign(a, { confirmationStatus: 'confirmed', confirmedAt: now() })
        record(id, 'update', { confirmation_status: 'confirmed' })
        return settle({ ...toAppointment(a), confirmedBy: 'staff' })
      },

      async history(id) {
        requireBarber(findAppointment(id).barberId)
        return settle(state.history.filter((h) => h.entityId === id))
      },
    },

    schedule: {
      daySlots: (serviceId, date, barberId) =>
        settle(daySlots(schedule(), serviceId, date, now(), barberId).map((s) => ({ startsAt: s.startsAt.toISOString(), barberIds: s.barberIds }))),
      capacity: (date) =>
        settle(dayCapacity(schedule(), date, state.barbers.filter((b) => b.active && canManageBarber(staff(), b.id)).map((b) => b.id))),
      blocks: ({ from, to }) =>
        settle(
          state.blocks.filter(
            (b) =>
              (b.barberId === null || canManageBarber(staff(), b.barberId)) &&
              dayKey(new Date(b.startsAt)) < to &&
              dayKey(new Date(new Date(b.endsAt).getTime() - 1)) >= from,
          ),
        ),
      async addBlock(block) {
        if (block.barberId === null) requireOwner()
        else requireBarber(block.barberId)
        const row: TimeBlock = { ...block, id: newId() }
        state.blocks.push(row)
        return settle(row)
      },
      async removeBlock(id) {
        const block = state.blocks.find((b) => b.id === id) ?? fail('not_found')
        if (block.barberId === null) requireOwner()
        else requireBarber(block.barberId)
        state.blocks = state.blocks.filter((b) => b.id !== id)
        return settle(undefined)
      },
    },

    waitlist: {
      list: ({ from, to }) =>
        settle(
          state.waitlist.filter(
            (w) =>
              w.date >= from && w.date < to && w.status === 'waiting' &&
              (isOwner(staff()) || w.barberId === null || w.barberId === staff().barberId),
          ),
        ),
      async remove(entryId) {
        const entry = state.waitlist.find((w) => w.id === entryId) ?? fail('not_found')
        if (!isOwner(staff()) && (entry.barberId ?? entry.offeredBarberId) !== staff().barberId) fail('forbidden')
        entry.status = 'removed'
        return settle(undefined)
      },
      // The prototype has no clock-driven jobs or push; the real scheduler runs in the database.
      runMaintenance: async () => settle(0),
    },

    barbers: {
      list: () => settle(state.barbers),
      async save(barber) {
        requireOwner()
        const existing = barber.id ? state.barbers.find((b) => b.id === barber.id) : undefined
        for (const h of [...barber.hours, ...barber.breaks]) if (h.end <= h.start) fail('invalid_status')
        const saved = { ...existing, ...barber, id: existing?.id ?? newId(), linkedUserId: existing?.linkedUserId ?? null, linkedCanBroadcast: existing?.linkedCanBroadcast ?? false }
        state.barbers = existing ? state.barbers.map((b) => (b.id === saved.id ? saved : b)) : [...state.barbers, saved]
        return settle(saved)
      },
      async setAccountRole() {
        requireOwner()
        // Accounts exist only in the real backend.
        fail('user_not_found')
      },
      async setBroadcastPermission(userId, allowed) {
        requireOwner()
        state.barbers.filter((b) => b.linkedUserId === userId).forEach((b) => (b.linkedCanBroadcast = allowed))
        return settle(undefined)
      },
    },

    services: {
      list: () => settle([...state.services].sort((a, b) => a.sortOrder - b.sortOrder)),
      async save(service, barberIds) {
        requireOwner()
        const id = service.id ?? newId()
        const existing = state.services.find((s) => s.id === id)
        const saved = { ...service, id, sortOrder: existing?.sortOrder ?? state.services.length }
        state.services = existing ? state.services.map((s) => (s.id === id ? saved : s)) : [...state.services, saved]
        for (const barber of state.barbers) {
          const offers = barber.services.some((s) => s.serviceId === id)
          if (barberIds.includes(barber.id) && !offers) barber.services.push({ serviceId: id, durationMinutes: null })
          if (!barberIds.includes(barber.id) && offers) barber.services = barber.services.filter((s) => s.serviceId !== id)
        }
        return settle(saved)
      },
      async reorder(ids) {
        requireOwner()
        ids.forEach((id, i) => {
          const service = state.services.find((s) => s.id === id)
          if (service) service.sortOrder = i
        })
        return settle(undefined)
      },
    },

    customers: {
      search(query) {
        const visible = visibleCustomerIds()
        const q = query.trim()
        return settle(
          state.customers
            .filter((c) => (!visible || visible.has(c.id)) && (!q || c.fullName.includes(q) || (c.phone ?? '').includes(q)))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'he')),
        )
      },
      async get(id) {
        const visible = visibleCustomerIds()
        if (visible && !visible.has(id)) fail('forbidden')
        const customer = state.customers.find((c) => c.id === id) ?? fail('customer_not_found')
        return settle({
          customer,
          appointments: state.appointments
            .filter((a) => a.customerId === id && canManageBarber(staff(), a.barberId))
            .sort((a, b) => b.start.getTime() - a.start.getTime())
            .map(toAppointment),
          notes: state.notes.filter((n) => n.customerId === id),
        })
      },
      async upsert(fullName, phone) {
        if (!fullName.trim()) fail('customer_details_required')
        const existing = phone ? state.customers.find((c) => c.phone === phone) : undefined
        if (existing) return settle(existing)
        const customer = { id: newId(), fullName: fullName.trim(), phone, hasAccount: false, createdAt: now().toISOString() }
        state.customers.push(customer)
        return settle(customer)
      },
      async update(id, change) {
        requireOwner()
        const customer = state.customers.find((c) => c.id === id) ?? fail('customer_not_found')
        Object.assign(customer, change)
        return settle(customer)
      },
      async addNote(customerId, body) {
        state.notes.unshift({ id: newId(), customerId, body, createdAt: now().toISOString() })
        return settle(undefined)
      },
    },

    notifications: {
      async send({ title, body, audience, link, idempotencyKey }) {
        if (!staff().canBroadcast) fail('forbidden')
        const existing = state.broadcasts.find((b) => b.key === idempotencyKey)
        if (existing) return settle({ id: existing.id, recipients: existing.recipients, duplicate: true })
        if (!title.trim() || title.length > 60 || !body.trim() || body.length > 240 || (link && !link.startsWith('?'))) fail('invalid_broadcast')
        if (state.broadcasts.some((b) => now().getTime() - new Date(b.createdAt).getTime() < 120_000)) fail('broadcast_too_soon')
        const record: BroadcastRecord & { key: string } = {
          id: newId(), key: idempotencyKey, title: title.trim(), body: body.trim(), audience, createdAt: now().toISOString(),
          senderName: staff().name, recipients: audience === 'upcoming' ? 6 : 14, pushAccepted: 0, pushFailed: 0, pushPending: 0,
        }
        state.broadcasts.unshift(record)
        return settle({ id: record.id, recipients: record.recipients, duplicate: false })
      },
      history: async () => {
        if (!staff().canBroadcast) fail('forbidden')
        return settle(state.broadcasts.filter((b) => isOwner(staff()) || b.senderName === staff().name))
      },
    },

    settings: {
      get: () => settle(state.settings),
      async save(value) {
        requireOwner()
        state.settings = value
        return settle(undefined)
      },
      gallery: () => settle(state.gallery),
      async saveGalleryItem(item) {
        requireOwner()
        const id = item.id ?? newId()
        state.gallery = [...state.gallery.filter((g) => g.id !== id), { ...item, id }]
        return settle(undefined)
      },
      async removeGalleryItem(id) {
        requireOwner()
        state.gallery = state.gallery.filter((g) => g.id !== id)
        return settle(undefined)
      },
      async uploadImage(file) {
        requireOwner()
        // Object URLs live only in this tab — consistent with the prototype's in-memory data.
        return URL.createObjectURL(file)
      },
    },
  }

  return {
    api,
    /** Switches the simulated signed-in role (prototype only). */
    setRole(role: Role) {
      state.role = role
      state.signedIn = true
      listeners.forEach((l) => l())
    },
    get role() {
      return state.role
    },
  }
}

export type PrototypeBackend = ReturnType<typeof createPrototypeApi>
