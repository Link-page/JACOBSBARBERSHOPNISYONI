import type { TimeSlot } from '@/api'
import { Button } from '@/components/ui/button'
import type { QueryState } from '@/hooks/use-query'
import { useDelayedFlag } from '@/hooks/use-delayed-flag'
import { daysBetween, fromDayKey } from '@/lib/date'
import { dayMonth, weekdayLong } from '@/lib/format'
import { useApp } from '@/store/app-context'

import { BookingContext } from '../components/booking-context'
import { TimeListSkeleton } from '../time/time-list-skeleton'
import { TimeSlotList } from '../time/time-slot-list'
import { WaitlistOffer } from '../waitlist/waitlist-offer'

type TimeStepProps = {
  date: string
  serviceId: string
  barberId: string
  duration: number
  slots: QueryState<TimeSlot[]>
  selectedTime?: string
  waitlistError: string | null
  onSelect: (slot: TimeSlot) => void
  onChooseAnotherDay: () => void
}

/** The selected day's open times — or, when the day is full, the waiting-list offer. */
export function TimeStep({
  date,
  serviceId,
  barberId,
  duration,
  slots,
  selectedTime,
  waitlistError,
  onSelect,
  onChooseAnotherDay,
}: TimeStepProps) {
  const { now } = useApp()
  const day = fromDayKey(date)
  const showSkeleton = useDelayedFlag(slots.loading && !slots.data)
  const nearby = ['היום', 'מחר', 'מחרתיים'][daysBetween(now, day)]

  return (
    <div className="px-5 pt-4 pb-8">
      <header>
        {nearby && <p className="text-footnote font-semibold text-brass">{nearby}</p>}
        <h2 className="font-display text-title1 font-medium">{weekdayLong(day)}</h2>
        <p className="text-subhead text-muted-foreground tabular">
          {dayMonth(day)} {day.getFullYear()}
          {slots.data && slots.data.length > 0 && ` · ${slots.data.length === 1 ? 'שעה פנויה אחת' : `${slots.data.length} שעות פנויות`}`}
        </p>
      </header>

      <BookingContext serviceId={serviceId} barberId={barberId} className="mt-3" />

      <div className="mt-2">
        {slots.error && !slots.data ? (
          <div role="alert" className="flex flex-col items-center gap-3 pt-10 text-center text-subhead text-muted-foreground">
            לא הצלחנו לטעון את השעות.
            <Button size="sm" variant="secondary" onClick={slots.reload}>
              ניסיון נוסף
            </Button>
          </div>
        ) : !slots.data ? (
          showSkeleton && <TimeListSkeleton />
        ) : slots.data.length === 0 ? (
          <WaitlistOffer
            date={date}
            serviceId={serviceId}
            barberId={barberId}
            error={waitlistError}
            onChooseAnotherDay={onChooseAnotherDay}
          />
        ) : (
          <TimeSlotList slots={slots.data} duration={duration} selected={selectedTime} barberId={barberId} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}
