import type { Appointment, TimeSlot } from '@/api'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { useAddToCalendar } from '@/hooks/use-add-to-calendar'
import { fromDayKey } from '@/lib/date'
import { endTime, formatPrice, shortDate } from '@/lib/format'

import { BookingActionBar } from './booking-action-bar'
import type { BookingFlow } from './use-booking-flow'

type BookingActionsProps = {
  flow: BookingFlow
  rescheduling: boolean
  /** The selected day's open times, once loaded. */
  daySlots?: TimeSlot[]
  confirming: boolean
  /** Why the last confirmation failed, if it did. */
  confirmError: string | null
  joiningWaitlist: boolean
  confirmed?: Appointment
  onConfirm: () => void
  onJoinWaitlist: () => void
  onClose: () => void
}

/** The bottom bar's buttons, which change with the current step. */
export function BookingActions({
  flow,
  rescheduling,
  daySlots,
  confirming,
  confirmError,
  joiningWaitlist,
  confirmed,
  onConfirm,
  onJoinWaitlist,
  onClose,
}: BookingActionsProps) {
  const { barberById, serviceById } = useCatalogue()
  const addToCalendar = useAddToCalendar()
  const { step, selection } = flow
  const service = selection.serviceId ? serviceById(selection.serviceId) : undefined

  if (step === 'done' && confirmed) {
    return (
      <BookingActionBar>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => addToCalendar(confirmed)}>
            הוספה ליומן
          </Button>
          <Button className="flex-1" onClick={onClose}>
            סיום
          </Button>
        </div>
      </BookingActionBar>
    )
  }

  if (step === 'waitlisted') {
    return (
      <BookingActionBar>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => flow.goTo('date')}>
            בחירת יום אחר
          </Button>
          <Button className="flex-1" onClick={onClose}>
            סיום
          </Button>
        </div>
      </BookingActionBar>
    )
  }

  const summary = [
    service?.name,
    selection.barberId && (selection.barberId === 'any' ? 'כל ספר פנוי' : barberById(selection.barberId).name),
    selection.date && shortDate(fromDayKey(selection.date)),
    selection.time && service && `${selection.time}–${endTime(selection.time, service.duration)}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const price = service && formatPrice(service.price)

  if (step === 'review') {
    return (
      <BookingActionBar>
        {confirmError && (
          <p role="alert" className="mb-2 text-center text-footnote text-destructive">
            {confirmError}
          </p>
        )}
        <Button className="w-full" disabled={confirming} onClick={onConfirm}>
          {confirming && <Spinner />}
          {rescheduling ? 'אישור המועד החדש' : `אישור התור · ${price}`}
        </Button>
      </BookingActionBar>
    )
  }

  // A fully booked day: the primary action becomes joining the waiting list.
  if (step === 'time' && daySlots?.length === 0) {
    return (
      <BookingActionBar summary={summary} price={price}>
        <Button className="w-full" disabled={joiningWaitlist} onClick={onJoinWaitlist}>
          {joiningWaitlist && <Spinner />}
          הצטרפות לרשימת המתנה
        </Button>
      </BookingActionBar>
    )
  }

  const ready =
    step === 'service' ? !!selection.serviceId : step === 'barber' ? !!selection.barberId : step === 'date' ? !!selection.date : !!selection.time

  return (
    <BookingActionBar summary={summary || undefined} price={price}>
      <Button className="w-full" disabled={!ready} onClick={flow.next}>
        {step === 'date' && !selection.date ? 'בחרו יום בלוח' : 'המשך'}
      </Button>
    </BookingActionBar>
  )
}
