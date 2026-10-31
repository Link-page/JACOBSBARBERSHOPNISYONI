import { m } from 'motion/react'
import { memo } from 'react'

import type { DayAvailability, DayStatus } from '@/api'
import { isSelectableDay } from '@/booking/availability'
import type { CalendarCell } from '@/booking/calendar'
import { fromDayKey } from '@/lib/date'
import { fullDate } from '@/lib/format'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AvailabilityMark } from './availability-mark'

const statusLabel = (day?: DayAvailability) => {
  switch (day?.status) {
    case 'available':
      return day.freeSlots === 1 ? 'תור פנוי אחד' : `${day.freeSlots} תורים פנויים`
    case 'full':
      return 'מלא, אפשר להצטרף לרשימת המתנה'
    case 'closed':
      return 'המספרה סגורה'
    case 'past':
      return 'לא זמין'
    case 'unavailable':
      return 'עדיין לא נפתח להזמנות'
    default:
      return 'טוען'
  }
}

const numberTone: Record<DayStatus, string> = {
  available: 'text-foreground font-medium',
  full: 'text-muted-foreground',
  closed: 'text-tertiary',
  past: 'text-tertiary opacity-60',
  unavailable: 'text-tertiary',
}

type DayCellProps = {
  cell: CalendarCell
  availability?: DayAvailability
  selected: boolean
  isToday: boolean
  loading: boolean
  onSelect: (date: string) => void
}

export const DayCell = memo(function DayCell({ cell, availability, selected, isToday, loading, onSelect }: DayCellProps) {
  const status = availability?.status
  const enabled = !loading && isSelectableDay(status)

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onSelect(cell.key)}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={`${fullDate(fromDayKey(cell.key))}, ${statusLabel(availability)}`}
      className="pressable relative flex h-[52px] flex-col items-center justify-center gap-[6px] rounded-[16px] disabled:cursor-default disabled:active:scale-100"
    >
      {selected && (
        <m.span
          layoutId="calendar-selection"
          transition={springSnappy}
          className="absolute inset-0 rounded-[16px] bg-primary shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)]"
        />
      )}
      {isToday && !selected && (
        <span aria-hidden className="absolute inset-[3px] rounded-[13px] border border-brass/55" />
      )}
      <span
        className={cn(
          'relative font-display text-[19px] leading-none tabular transition-colors duration-200',
          selected ? 'font-medium text-primary-foreground' : status ? numberTone[status] : 'text-muted-foreground',
        )}
      >
        {cell.day}
      </span>
      <span className="relative flex h-[6px] items-center">
        <AvailabilityMark
          status={status}
          freeSlots={availability?.freeSlots}
          inverted={selected}
          loading={loading && !availability}
        />
      </span>
    </button>
  )
})
