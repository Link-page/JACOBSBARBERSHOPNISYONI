import { fromDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

import type { Appointment, TimeBlock } from '../../data/types'
import { dateOf } from '../appointments/time'

const weekdays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

/** Month overview: how busy each day is; tap a day to open it. */
export function MonthGrid({
  days,
  month,
  today,
  appointments,
  blocks,
  onPick,
}: {
  days: string[]
  month: string
  today: string
  appointments: Appointment[]
  blocks: TimeBlock[]
  onPick: (date: string) => void
}) {
  const counts = new Map<string, number>()
  for (const a of appointments) if (a.status !== 'cancelled') counts.set(dateOf(a.startsAt), (counts.get(dateOf(a.startsAt)) ?? 0) + 1)
  const closed = new Set(blocks.filter((b) => b.barberId === null).flatMap((b) => days.filter((d) => d >= dateOf(b.startsAt) && d < dateOf(b.endsAt))))

  return (
    <div className="rounded-[24px] bg-card p-3 shadow-elevation lg:p-4">
      <div className="grid grid-cols-7 pb-2 text-center text-caption text-muted-foreground">
        {weekdays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const count = counts.get(date) ?? 0
          const inMonth = date.slice(0, 7) === month
          return (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              aria-label={`${fromDayKey(date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}: ${closed.has(date) ? 'סגור' : `${count} תורים`}`}
              className={cn(
                'pressable flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] lg:aspect-auto lg:h-24 lg:items-start lg:justify-between lg:p-3',
                date === today ? 'ring-1 ring-brass' : '',
                inMonth ? 'bg-muted/60' : 'opacity-40',
              )}
            >
              <span className="font-display text-headline leading-none tabular">{fromDayKey(date).getDate()}</span>
              {closed.has(date) ? (
                <span className="text-caption2 text-muted-foreground">סגור</span>
              ) : (
                count > 0 && <span className="rounded-full bg-brass-soft px-1.5 text-caption2 font-semibold text-brass-strong tabular lg:text-caption">{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
