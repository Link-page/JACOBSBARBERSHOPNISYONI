import type { AppointmentStatus } from '../data/types'
import { cn } from '@/lib/utils'

const labels: Record<AppointmentStatus, string> = {
  booked: 'נקבע',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
}

const tones: Record<AppointmentStatus, string> = {
  booked: 'bg-brass-soft text-brass-strong',
  completed: 'bg-success/12 text-success',
  cancelled: 'bg-muted text-muted-foreground',
  no_show: 'bg-destructive/12 text-destructive',
}

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-caption font-semibold', tones[status], className)}>
      {labels[status]}
    </span>
  )
}
