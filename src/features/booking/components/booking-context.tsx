import { Scissors, UserRound } from 'lucide-react'

import { barberById, serviceById } from '@/data/shop'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

/** The service and barber being booked, as quiet chips above the calendar and time list. */
export function BookingContext({ serviceId, barberId, className }: { serviceId: string; barberId: string; className?: string }) {
  const service = serviceById(serviceId)
  const chips = [
    { icon: Scissors, label: `${service.name} · ${formatDuration(service.duration)}` },
    { icon: UserRound, label: barberId === 'any' ? 'כל ספר פנוי' : `אצל ${barberById(barberId).name}` },
  ]
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {chips.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-footnote font-medium shadow-elevation"
        >
          <Icon className="size-3.5 text-brass" strokeWidth={2.2} />
          {label}
        </span>
      ))}
    </div>
  )
}
