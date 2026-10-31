import { cn } from '@/lib/utils'

import { AvailabilityMark } from './availability-mark'

/** Key for the marks used in the month grid. */
export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-footnote text-muted-foreground', className)}>
      <li className="flex items-center gap-2">
        <AvailabilityMark status="available" freeSlots={9} />
        יש תורים
      </li>
      <li className="flex items-center gap-2">
        <AvailabilityMark status="full" />
        מלא · רשימת המתנה
      </li>
      <li className="flex items-center gap-2">
        <span className="font-display text-subhead leading-none text-tertiary">7</span>
        סגור
      </li>
    </ul>
  )
}
