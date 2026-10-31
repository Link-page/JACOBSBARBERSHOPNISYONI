import { useCallback, useState } from 'react'

import { toBookingError, type Appointment } from '@/api'
import { backend } from '@/backend'
import { invalidateQueries } from '@/hooks/use-query'
import { combine } from '@/lib/date'
import { useApp } from '@/store/app-context'

type Draft = { serviceId: string; barberId: string; date: string; time: string }
type State = { status: 'idle' | 'pending' } | { status: 'error'; message: string }

/** Sends a new booking (or a reschedule of `existing`) and saves the result to the app's list. */
export function useConfirmBooking(existing?: Appointment) {
  const { saveAppointment } = useApp()
  const [state, setState] = useState<State>({ status: 'idle' })

  const confirm = useCallback(
    async ({ serviceId, barberId, date, time }: Draft) => {
      setState({ status: 'pending' })
      try {
        const start = combine(date, time).toISOString()
        const appointment = existing
          ? await backend.booking.rescheduleAppointment(existing, { barberId, start })
          : await backend.booking.createAppointment({ serviceId, barberId, start })
        saveAppointment(appointment)
        invalidateQueries('availability|')
        setState({ status: 'idle' })
        return appointment
      } catch (error) {
        // A slot taken meanwhile: refresh the times shown.
        invalidateQueries('availability|')
        setState({ status: 'error', message: toBookingError(error).message })
        return null
      }
    },
    [existing, saveAppointment],
  )

  return { status: state.status, error: state.status === 'error' ? state.message : null, confirm }
}
