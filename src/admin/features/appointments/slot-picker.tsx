import { m } from 'motion/react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useAdminQuery } from '../../data/api-context'
import { timeOf, toIso } from './time'

type SlotPickerProps = {
  serviceId: string
  barberId: string
  date: string
  value: string | null
  onChange: (startsAt: string) => void
}

/**
 * Free start times for the barber and service, straight from the backend's
 * availability rules. Staff can also type another time; the server still
 * rejects anything that overlaps or falls outside working hours.
 */
export function SlotPicker({ serviceId, barberId, date, value, onChange }: SlotPickerProps) {
  const slots = useAdminQuery(serviceId && barberId && date ? `slots|${serviceId}|${barberId}|${date}` : null, (api) =>
    api.schedule.daySlots(serviceId, date, barberId),
  )
  const [custom, setCustom] = useState('')
  const selected = value ? timeOf(value) : null

  if (!serviceId || !barberId || !date) return <p className="text-footnote text-muted-foreground">בחרו ספר, טיפול ותאריך.</p>

  return (
    <div>
      {slots.loading && !slots.data ? (
        <div className="grid grid-cols-4 gap-2" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="shimmer h-11 rounded-[12px]" />
          ))}
        </div>
      ) : slots.data?.length ? (
        <div role="radiogroup" aria-label="שעות פנויות" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.data.map((slot) => {
            const time = timeOf(slot.startsAt)
            const active = time === selected
            return (
              <button
                key={slot.startsAt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(slot.startsAt)}
                className={cn('pressable relative h-11 rounded-[12px] text-callout font-semibold tabular', !active && 'bg-muted')}
              >
                {active && <m.span layoutId="admin-slot" transition={springSnappy} className="absolute inset-0 rounded-[12px] bg-primary" />}
                <span className={cn('relative', active && 'text-primary-foreground')}>{time}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="rounded-[14px] bg-muted px-4 py-3 text-footnote text-muted-foreground">אין שעות פנויות לפי כללי ההזמנה ביום הזה.</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="custom-time" className="shrink-0 text-footnote text-muted-foreground">
          שעה אחרת
        </label>
        <Input
          id="custom-time"
          type="time"
          step={300}
          dir="ltr"
          className="h-10 w-32"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value)
            if (e.target.value) onChange(toIso(date, e.target.value))
          }}
        />
      </div>
    </div>
  )
}
