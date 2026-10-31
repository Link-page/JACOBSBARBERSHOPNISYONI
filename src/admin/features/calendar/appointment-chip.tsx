import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

import { useCatalogue } from '../../components/use-catalogue'
import type { Appointment } from '../../data/types'
import { timeOf } from '../appointments/time'

const tone: Record<Appointment['status'], string> = {
  booked: 'bg-brass-soft border-brass text-foreground',
  completed: 'bg-success/10 border-success text-foreground',
  no_show: 'bg-destructive/10 border-destructive text-foreground',
  cancelled: 'bg-muted border-tertiary text-muted-foreground line-through',
}

/** An appointment drawn in the time grid; status shows as tint + edge colour + text in the sheet. */
export function AppointmentChip({ appointment, style, onClick }: { appointment: Appointment; style?: CSSProperties; onClick: () => void }) {
  const { serviceName } = useCatalogue()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={style}
      aria-label={`${timeOf(appointment.startsAt)} ${appointment.customerName}, ${serviceName(appointment.serviceId)}`}
      className={cn(
        'absolute inset-x-1 overflow-hidden rounded-[10px] border-s-[3px] px-2 py-1 text-start transition-transform hover:z-10 hover:scale-[1.02]',
        tone[appointment.status],
      )}
    >
      <span className="block truncate text-caption font-semibold">{appointment.customerName}</span>
      <span className="block truncate text-caption2 opacity-75">
        {timeOf(appointment.startsAt)} · {serviceName(appointment.serviceId)}
      </span>
    </button>
  )
}
