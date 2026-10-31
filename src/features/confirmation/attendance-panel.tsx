import { CalendarCheck, CircleCheck } from 'lucide-react'

import type { Appointment } from '@/api'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { dayMonth, formatTime, weekdayLong } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { AttendanceView } from './attendance'
import { useConfirmAttendance } from './use-confirm-attendance'

const deadlineLabel = (d: Date) => `${weekdayLong(d)} בשעה ${formatTime(d)}`

/**
 * Attendance for one upcoming appointment: the confirm button before the
 * deadline, then "הגעה אושרה". `tone="ink"` sits on the dark next-appointment card.
 */
export function AttendancePanel({ appointment, view, tone = 'card' }: { appointment: Appointment; view: AttendanceView; tone?: 'card' | 'ink' }) {
  const { pending, error, confirm } = useConfirmAttendance()
  const ink = tone === 'ink'

  if (view.kind === 'none') return null
  if (view.kind === 'confirmed') {
    return (
      <div className={cn('flex items-center gap-2 text-footnote', ink ? 'text-ink-foreground/80' : 'text-muted-foreground')}>
        <CircleCheck className="size-4 shrink-0 text-brass" strokeWidth={2.2} />
        <span>
          <strong className={ink ? 'text-ink-foreground' : 'text-foreground'}>הגעה אושרה</strong>
          {view.at && ` · ${dayMonth(view.at)} ${formatTime(view.at)}`}. לביטול או שינוי — דרך המספרה.
        </span>
      </div>
    )
  }
  if (view.kind === 'closed') {
    return <p className={cn('text-footnote', ink ? 'text-ink-foreground/70' : 'text-muted-foreground')}>המועד לאישור הגעה עבר. אם התור יבוטל, תופיע כאן הודעה.</p>
  }
  return (
    <div className={cn('rounded-[18px] p-3', ink ? 'bg-white/[0.06]' : 'bg-brass-soft')}>
      <div className="flex items-start gap-2.5">
        <CalendarCheck className="mt-0.5 size-5 shrink-0 text-brass" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <p className="text-subhead font-semibold">נדרש אישור הגעה</p>
          <p className={cn('text-footnote', ink ? 'text-ink-foreground/70' : 'text-muted-foreground')}>
            יש לאשר עד {deadlineLabel(view.deadline)}. תור שלא אושר עלול להתבטל.
          </p>
        </div>
      </div>
      <Button className="mt-3 h-11 w-full" variant={ink ? 'secondary' : 'default'} disabled={pending} onClick={() => void confirm(appointment.id)}>
        {pending ? <Spinner /> : <CircleCheck className="size-4" />}
        אישור הגעה
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
