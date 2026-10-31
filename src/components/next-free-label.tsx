import { useNextAvailable } from '@/hooks/use-availability'
import { slotLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

type NextFreeLabelProps = { barberId: string; duration: number; prefix?: string; className?: string }

/** The earliest open slot for a barber (or "any"), e.g. "היום 17:30". */
export function NextFreeLabel({ barberId, duration, prefix = '', className }: NextFreeLabelProps) {
  const { now } = useApp()
  const { data, loading } = useNextAvailable({ barberId, duration })
  if (loading && data === undefined) return <span aria-hidden className={cn('shimmer block h-4 w-16 rounded-full', className)} />
  return <span className={cn('block', className)}>{data ? prefix + slotLabel(data.date, data.time, now) : 'אין תורים פנויים'}</span>
}
