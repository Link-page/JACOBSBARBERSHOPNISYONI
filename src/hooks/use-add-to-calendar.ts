import { useCallback } from 'react'

import { useCatalogue } from '@/catalogue/catalogue-context'
import { addToCalendar } from '@/lib/calendar'
import type { Appointment } from '@/store/types'

/** "Add to calendar" for an appointment, with its service and barber resolved from the catalogue. */
export function useAddToCalendar() {
  const { barberById, serviceById } = useCatalogue()
  return useCallback(
    (appointment: Appointment) => addToCalendar(appointment, serviceById(appointment.serviceId), barberById(appointment.barberId)),
    [barberById, serviceById],
  )
}
