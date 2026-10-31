import { m } from 'motion/react'
import { memo } from 'react'

import type { TimeSlot } from '@/api'
import { SelectionRing } from '@/components/selection-ring'
import { endTime } from '@/lib/format'
import { spring, springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

type TimeSlotRowProps = {
  slot: TimeSlot
  duration: number
  selected: boolean
  /** Shown when the customer chose "any barber". */
  barberName?: string
  /** Position in the list, for a short entrance stagger. */
  index: number
  onSelect: (slot: TimeSlot) => void
}

/** One bookable start time. The ink selection tile glides between rows. */
export const TimeSlotRow = memo(function TimeSlotRow({ slot, duration, selected, barberName, index, onSelect }: TimeSlotRowProps) {
  return (
    <m.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(slot)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: Math.min(index, 8) * 0.025 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex h-16 w-full items-center gap-4 rounded-[18px] bg-card px-5 text-start shadow-[0_1px_2px_rgb(18_18_17/0.04)]"
    >
      {selected && (
        <m.span
          layoutId="time-selection"
          transition={springSnappy}
          className="absolute inset-0 rounded-[18px] bg-primary shadow-[0_10px_22px_-12px_rgb(0_0_0/0.5)]"
        />
      )}
      <span className={cn('relative font-display text-[24px] leading-none tabular', selected && 'text-primary-foreground')}>
        {slot.time}
      </span>
      <span className={cn('relative text-footnote tabular', selected ? 'text-primary-foreground/65' : 'text-muted-foreground')}>
        עד {endTime(slot.time, duration)}
      </span>
      <span className={cn('relative ms-auto text-footnote', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {barberName && `אצל ${barberName}`}
      </span>
      <SelectionRing selected={selected} className={cn('relative', selected && 'border-brass')} />
    </m.button>
  )
})
