import { CalendarCheck, CircleCheck, CircleSlash } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'
import type { Appointment } from '../../data/types'

const confirmedBy: Record<NonNullable<Appointment['confirmedBy']>, string> = {
  customer: 'על ידי הלקוח',
  staff: 'טלפונית, על ידי הצוות',
  booking: 'נקבע ברגע האחרון — ההזמנה נחשבת אישור',
}

const cancelledBecause: Record<NonNullable<Appointment['cancellationReason']>, string> = {
  customer: 'בוטל על ידי הלקוח',
  staff: 'בוטל על ידי הצוות',
  no_confirmation: 'בוטל אוטומטית: ההגעה לא אושרה בזמן',
  system: 'בוטל על ידי המערכת',
}

/** Possible when auto-cancel is off: still booked, never confirmed. Staff can still confirm by phone. */
const deadlinePassed = (iso: string | null) => iso !== null && new Date(iso) <= new Date()

const when = (iso: string) => new Date(iso).toLocaleString('he-IL', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

/** Attendance confirmation and cancellation reason, with a by-phone confirm for staff. */
export function AttendanceInfo({ appointment, onChanged }: { appointment: Appointment; onChanged: (a: Appointment) => void }) {
  const api = useAdminApi()
  const { run, pending } = useAction()

  if (appointment.status === 'cancelled') {
    return appointment.cancellationReason ? (
      <p className="flex items-center gap-2 text-footnote text-muted-foreground">
        <CircleSlash className="size-4" />
        {cancelledBecause[appointment.cancellationReason]}
      </p>
    ) : null
  }
  if (appointment.status !== 'booked') return null

  if (appointment.confirmationStatus === 'confirmed') {
    return (
      <p className="flex items-center gap-2 text-footnote">
        <CircleCheck className="size-4 text-brass" />
        <span>
          <strong>הגעה אושרה</strong>
          {appointment.confirmedBy && ` · ${confirmedBy[appointment.confirmedBy]}`}
          {appointment.confirmedAt && ` · ${when(appointment.confirmedAt)}`}
        </span>
      </p>
    )
  }
  if (appointment.confirmationStatus === 'not_required') {
    return <p className="text-footnote text-muted-foreground">אישור הגעה לא נדרש לתור הזה.</p>
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-brass-soft px-3 py-2.5">
      <p className="flex items-center gap-2 text-footnote">
        <CalendarCheck className="size-4 text-brass" />
        {deadlinePassed(appointment.confirmationDeadline)
          ? `לא אושר עד המועד (${when(appointment.confirmationDeadline!)})`
          : `ממתין לאישור הגעה${appointment.confirmationDeadline ? ` · עד ${when(appointment.confirmationDeadline)}` : ''}`}
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="h-9"
        disabled={pending}
        onClick={async () => {
          const updated = await run(() => api.appointments.confirm(appointment.id), 'ההגעה אושרה')
          if (updated) onChanged(updated)
        }}
      >
        אישור טלפוני
      </Button>
    </div>
  )
}
