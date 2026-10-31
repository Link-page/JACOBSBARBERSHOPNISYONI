import { useCustomer } from '@/account/account-context'
import type { Appointment } from '@/api'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { dayMonth, formatTime, weekdayLong } from '@/lib/format'

import { cancellationRequestLink } from './whatsapp-link'

/** The barber's WhatsApp, or the shop's, with the appointment details prefilled. */
export function useCancellationRequestLink(appointment: Appointment): string | null {
  const { barberById, serviceById, contact } = useCatalogue()
  const profile = useCustomer()
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  return cancellationRequestLink(barber.whatsapp || contact.whatsapp, {
    customerName: profile.fullName,
    when: `${weekdayLong(start)} ${dayMonth(start)} בשעה ${formatTime(start)}`,
    service: serviceById(appointment.serviceId).name,
    barber: barber.name,
  })
}
