import { useMemo } from 'react'

import type { TimeSlot } from '@/api'
import { groupByDayPart } from '@/booking/day-parts'
import { barberById } from '@/data/shop'

import { DayPartSection } from './day-part-section'
import { TimeSlotRow } from './time-slot-row'

type TimeSlotListProps = {
  slots: TimeSlot[]
  duration: number
  selected?: string
  /** "any" shows which barber each time would be with. */
  barberId: string
  onSelect: (slot: TimeSlot) => void
}

/** Vertically scrolling list of open times, grouped into morning, afternoon and evening. */
export function TimeSlotList({ slots, duration, selected, barberId, onSelect }: TimeSlotListProps) {
  const parts = useMemo(() => groupByDayPart(slots), [slots])
  let index = 0

  return (
    <div role="radiogroup" aria-label="שעות פנויות" className="flex flex-col gap-4">
      {parts.map((part) => (
        <DayPartSection key={part.id} part={part.id} count={part.slots.length}>
          {part.slots.map((slot) => (
            <TimeSlotRow
              key={slot.time}
              slot={slot}
              duration={duration}
              selected={slot.time === selected}
              barberName={barberId === 'any' ? barberById(slot.barberIds[0]).name : undefined}
              index={index++}
              onSelect={onSelect}
            />
          ))}
        </DayPartSection>
      ))}
    </div>
  )
}
