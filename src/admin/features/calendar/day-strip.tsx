import { m } from 'motion/react'

import { fromDayKey } from '@/lib/date'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Phone week strip for picking a day; the selection glides between days. */
export function DayStrip({ days, value, today, onChange }: { days: string[]; value: string; today: string; onChange: (date: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((date) => {
        const d = fromDayKey(date)
        const active = date === value
        return (
          <button
            key={date}
            type="button"
            onClick={() => onChange(date)}
            aria-pressed={active}
            className="pressable relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-[16px]"
          >
            {active && <m.span layoutId="admin-day" transition={springSnappy} className="absolute inset-0 rounded-[16px] bg-primary" />}
            <span className={cn('relative text-caption2', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {d.toLocaleDateString('he-IL', { weekday: 'short' }).replace('יום ', '')}
            </span>
            <span className={cn('relative font-display text-headline leading-none tabular', active && 'text-primary-foreground', date === today && !active && 'text-brass')}>
              {d.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
