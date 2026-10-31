import type { DayStatus } from '@/api'
import { cn } from '@/lib/utils'

/** Bar length grows with the number of free slots: a little, some, plenty. */
const barWidth = (free: number) => (free <= 3 ? 6 : free <= 8 ? 11 : 16)

type AvailabilityMarkProps = {
  status?: DayStatus
  freeSlots?: number
  /** Drawn on the ink selection tile. */
  inverted?: boolean
  loading?: boolean
}

/** The small sign under a day number: a brass bar when open, a hollow ring when full. */
export function AvailabilityMark({ status, freeSlots = 0, inverted, loading }: AvailabilityMarkProps) {
  if (loading) return <span aria-hidden className="shimmer h-[3px] w-3 rounded-full" />
  if (status === 'available') {
    return (
      <span
        aria-hidden
        className="h-[3px] rounded-full bg-brass transition-[width] duration-300"
        style={{ width: barWidth(freeSlots) }}
      />
    )
  }
  if (status === 'full') {
    return (
      <span
        aria-hidden
        className={cn(
          'size-[6px] rounded-full border-[1.5px]',
          inverted ? 'border-primary-foreground/70' : 'border-muted-foreground/80',
        )}
      />
    )
  }
  return <span aria-hidden className="h-[3px]" />
}
