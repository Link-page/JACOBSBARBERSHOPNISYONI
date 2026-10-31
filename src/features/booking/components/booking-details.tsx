import { useCatalogue } from '@/catalogue/catalogue-context'
import { endTime, formatDuration, formatPrice, fullDate } from '@/lib/format'
import { fromDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

type BookingDetailsProps = {
  serviceId: string
  /** A barber id, or "any". */
  barberId: string
  date: string
  time?: string
  className?: string
}

/** Label/value summary of a booking or waiting-list request. */
export function BookingDetails({ serviceId, barberId, date, time, className }: BookingDetailsProps) {
  const { barberById, serviceById } = useCatalogue()
  const service = serviceById(serviceId)
  const rows = [
    { label: 'טיפול', value: service.name },
    { label: 'ספר', value: barberId === 'any' ? 'כל ספר פנוי' : barberById(barberId).name },
    { label: 'יום', value: fullDate(fromDayKey(date)) },
    ...(time ? [{ label: 'שעה', value: `${time}–${endTime(time, service.duration)}` }] : []),
    { label: 'משך', value: formatDuration(service.duration) },
    { label: 'מחיר', value: formatPrice(service.price) },
  ]
  return (
    <dl className={cn('w-full divide-y divide-border rounded-[22px] bg-card px-4 shadow-elevation', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-subhead">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="text-end font-medium tabular">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
