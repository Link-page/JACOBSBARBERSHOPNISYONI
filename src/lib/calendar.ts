import { barberById, serviceById, shop } from '@/data/shop'
import { links } from '@/lib/links'
import type { Appointment } from '@/store/types'

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

/** Downloads an .ics file; iOS opens it straight into the "Add to Calendar" sheet. */
export function addToCalendar(appointment: Appointment) {
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  const end = new Date(start.getTime() + service.duration * 60_000)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${shop.legalName}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@jacobs`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`${service.name} · ${shop.name}`)}`,
    `DESCRIPTION:${escape(`אצל ${barber.name}`)}`,
    `LOCATION:${escape(links.fullAddress)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(`${service.name} בעוד שעה`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${shop.name.replace(/\W/g, '')}-${service.id}.ics`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
