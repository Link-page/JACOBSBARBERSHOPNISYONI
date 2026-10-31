import { dayAvailability, firstAvailable, freeSlots, resolveBarbers } from '@/booking/availability'
import { monthCells } from '@/booking/calendar'
import { fromDayKey } from '@/lib/date'
import { newId } from '@/lib/id'

import type { BookingApi } from '../booking-api'
import { appointmentStore } from './appointment-store'
import { isBooked } from './shop-diary'
import { waitlistStore } from './waitlist-store'

/**
 * On-device implementation used until the shop has a booking server.
 * Availability comes from a simulated diary; anything the customer submits
 * stays on this device, which is why `connected` is false.
 */
export const localBookingApi: BookingApi = {
  connected: false,

  async getMonthAvailability(month, { barberId, duration }) {
    const now = new Date()
    const team = resolveBarbers(barberId)
    return monthCells(month)
      .filter((cell) => cell !== null)
      .map((cell) => dayAvailability(fromDayKey(cell.key), team, duration, now, isBooked))
  },

  async getDaySlots(date, { barberId, duration }) {
    return freeSlots(fromDayKey(date), resolveBarbers(barberId), duration, new Date(), isBooked)
  },

  async getNextAvailable({ barberId, duration }) {
    return firstAvailable(resolveBarbers(barberId), duration, new Date(), isBooked)
  },

  async listAppointments() {
    return appointmentStore.all()
  },

  async createAppointment(input) {
    return appointmentStore.upsert({ id: newId(), status: 'booked', ...input })
  },

  async rescheduleAppointment(appointment, change) {
    return appointmentStore.upsert({ ...appointment, ...change })
  },

  async cancelAppointment(id) {
    const appointment = appointmentStore.all().find((a) => a.id === id)
    if (appointment) appointmentStore.upsert({ ...appointment, status: 'cancelled' })
  },

  async joinWaitlist(request) {
    const existing = waitlistStore.find(request)
    if (existing) return { ...existing, alreadyOnList: true }
    const receipt = { id: newId(), request, createdAt: new Date().toISOString(), alreadyOnList: false }
    waitlistStore.add(receipt)
    return receipt
  },
}
