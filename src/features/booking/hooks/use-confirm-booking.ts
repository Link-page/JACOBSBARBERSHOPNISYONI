import { useCallback, useState } from 'react'

import { api, type Appointment } from '@/api'
import { invalidateQueries } from '@/hooks/use-query'
import { combine } from '@/lib/date'
import { useApp } from '@/store/app-context'

type Draft = { serviceId: string; barberId: string; date: string; time: string }

/** Sends a new booking (or a reschedule of `existing`) and saves the result to the app's list. */
export function useConfirmBooking(existing?: Appointment) {
  const { saveAppointment } = useApp()
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')

  const confirm = useCallback(
    async ({ serviceId, barberId, date, time }: Draft) => {
      setStatus('pending')
      try {
        const start = combine(date, time).toISOString()
        const appointment = existing
          ? await api.rescheduleAppointment(existing, { barberId, start })
          : await api.createAppointment({ serviceId, barberId, start })
        saveAppointment(appointment)
        invalidateQueries('availability|')
        setStatus('idle')
        return appointment
      } catch {
        setStatus('error')
        return null
      }
    },
    [existing, saveAppointment],
  )

  return { status, confirm }
}
