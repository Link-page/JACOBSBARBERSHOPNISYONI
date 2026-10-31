import { useCallback, useEffect, useMemo, useState } from 'react'

import { toBookingError } from '@/api'
import { backend } from '@/backend'
import { invalidateQueries } from '@/hooks/use-query'

import type { Appointment } from './types'

const startTime = (a: Appointment) => new Date(a.start).getTime()

/**
 * The signed-in customer's appointments, from the booking backend (the source
 * of truth). Re-read when the app returns to the foreground, so changes the
 * shop made meanwhile show up.
 */
export function useAppointments(now: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  // On failure keep what is shown; the next refresh tries again.
  const refresh = useCallback(() => backend.booking.listAppointments().then(setAppointments, () => {}), [])

  useEffect(() => {
    void refresh()
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  /** Adds a new appointment or replaces one with the same id (after booking or rescheduling). */
  const saveAppointment = useCallback((appointment: Appointment) => {
    setAppointments((list) => [...list.filter((a) => a.id !== appointment.id), appointment])
  }, [])

  /** Cancels on the server; resolves with the reason if it was refused. */
  const cancel = useCallback(async (id: string): Promise<string | null> => {
    try {
      await backend.booking.cancelAppointment(id)
      setAppointments((list) => list.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)))
      invalidateQueries('availability|')
      return null
    } catch (error) {
      return toBookingError(error).message
    }
  }, [])

  const { upcoming, past } = useMemo(() => {
    const t = now.getTime()
    return {
      upcoming: appointments.filter((a) => a.status === 'booked' && startTime(a) > t).sort((a, b) => startTime(a) - startTime(b)),
      past: appointments.filter((a) => a.status !== 'booked' || startTime(a) <= t).sort((a, b) => startTime(b) - startTime(a)),
    }
  }, [appointments, now])

  return { appointments, upcoming, past, saveAppointment, cancel }
}
