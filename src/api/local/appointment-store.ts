import { hoursFor } from '@/booking/availability'
import { addDays, combine, dayKey, toMinutes } from '@/lib/date'
import { newId } from '@/lib/id'

import type { Appointment } from '../types'

const KEY = 'jacobs.demo.appointments.v2'

/** The on-device demo has no confirmation policy. */
const demoConfirmation = { confirmationStatus: 'not_required', confirmationDeadline: null, confirmedAt: null, cancellationReason: null } as const

/** Nearest day (searching in `step` direction) the shop is open until at least 20:00. */
function fullDayFrom(date: Date, step: 1 | -1) {
  let d = date
  for (let i = 0; i < 7; i++) {
    const h = hoursFor(d)
    if (h && toMinutes(h.close) >= toMinutes('20:00')) return d
    d = addDays(d, step)
  }
  return date
}

/** A believable history for the demo's first launch. */
function seed(now: Date): Appointment[] {
  const at = (date: Date, time: string) => combine(dayKey(date), time).toISOString()
  return [
    { id: newId(), serviceId: 'signature', barberId: 'jacob', start: at(fullDayFrom(addDays(now, 2), 1), '17:30'), status: 'booked', ...demoConfirmation },
    { id: newId(), serviceId: 'skin-fade', barberId: 'jacob', start: at(fullDayFrom(addDays(now, -23), -1), '12:00'), status: 'completed', ...demoConfirmation },
    { id: newId(), serviceId: 'cut-beard', barberId: 'jacob', start: at(fullDayFrom(addDays(now, -51), -1), '18:00'), status: 'completed', ...demoConfirmation },
  ]
}

function read(): Appointment[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Appointment[]) : null
  } catch {
    return null
  }
}

/** Demo appointments kept on this device only. */
export const appointmentStore = {
  all(): Appointment[] {
    const stored = read()
    if (stored) return stored
    const initial = seed(new Date())
    this.write(initial)
    return initial
  },
  write(list: Appointment[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
    } catch {
      // Storage unavailable (private mode): the demo still works for this visit.
    }
  },
  upsert(appointment: Appointment) {
    const list = this.all().filter((a) => a.id !== appointment.id)
    this.write([...list, appointment])
    return appointment
  },
}
