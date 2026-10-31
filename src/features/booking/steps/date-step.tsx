import { CalendarCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { AvailabilityQuery } from '@/api'
import { BOOKING_WINDOW_DAYS } from '@/booking/availability'
import { browsableMonths } from '@/booking/calendar'
import { useMonthAvailability, useNextAvailable } from '@/hooks/use-availability'
import { dayKey, fromDayKey, monthKey } from '@/lib/date'
import { slotLabel } from '@/lib/format'
import { useApp } from '@/store/app-context'

import { CalendarLegend } from '../calendar/calendar-legend'
import { MonthCalendar } from '../calendar/month-calendar'
import { BookingContext } from '../components/booking-context'

type DateStepProps = {
  serviceId: string
  barberId: string
  query: AvailabilityQuery
  selected?: string
  onSelect: (date: string) => void
}

/** Full-month calendar. Tapping a bookable day moves straight on to its time screen. */
export function DateStep({ serviceId, barberId, query, selected, onSelect }: DateStepProps) {
  const { now } = useApp()
  const today = dayKey(now)
  // Recomputed only when the day changes, not on every clock tick.
  const range = useMemo(() => browsableMonths(fromDayKey(today), BOOKING_WINDOW_DAYS), [today])
  const [month, setMonth] = useState(() => (selected ? selected.slice(0, 7) : monthKey(now)))
  const availability = useMonthAvailability(month, query)
  const next = useNextAvailable(query)

  const pick = (date: string) => {
    setMonth(date.slice(0, 7))
    onSelect(date)
  }

  return (
    <div className="px-5 pt-4 pb-8">
      <BookingContext serviceId={serviceId} barberId={barberId} />

      <MonthCalendar
        className="mt-4"
        month={month}
        range={range}
        onMonthChange={setMonth}
        days={availability.data}
        loading={availability.loading}
        error={availability.error}
        onRetry={availability.reload}
        selected={selected}
        today={today}
        onSelect={pick}
      />

      <CalendarLegend className="mt-4" />

      {next.data && (
        <button
          type="button"
          onClick={() => pick(next.data!.date)}
          className="pressable mt-6 flex w-full items-center gap-3 rounded-[20px] border border-dashed border-brass/45 px-4 py-3.5 text-start"
        >
          <CalendarCheck className="size-5 shrink-0 text-brass" strokeWidth={1.8} />
          <span className="flex-1 text-subhead">
            <span className="text-muted-foreground">התור הפנוי הקרוב</span>
            <span className="ms-2 font-semibold tabular">{slotLabel(next.data.date, next.data.time, now)}</span>
          </span>
        </button>
      )}
    </div>
  )
}
