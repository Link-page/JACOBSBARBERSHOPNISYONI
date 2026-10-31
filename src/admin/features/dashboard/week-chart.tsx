import { useState } from 'react'

import { fromDayKey } from '@/lib/date'
import { weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'

import { Panel } from '../../components/field'

type Day = { date: string; completed: number; booked: number; noShow: number }

/**
 * Appointments per day this week (cancellations excluded). One series, so no
 * legend; values appear on hover/focus and in a table for screen readers.
 */
export function WeekChart({ days, today }: { days: Day[]; today: string }) {
  const [active, setActive] = useState<number | null>(null)
  const totals = days.map((d) => d.completed + d.booked + d.noShow)
  const max = Math.max(4, ...totals)
  const shown = active ?? days.findIndex((d) => d.date === today)
  const focus = shown >= 0 ? days[shown] : null

  return (
    <Panel title="תורים השבוע">
      <p className="h-5 text-footnote text-muted-foreground" aria-hidden>
        {focus &&
          `${weekdayShort(fromDayKey(focus.date))} · ${totals[shown]} תורים${focus.completed ? ` · ${focus.completed} הושלמו` : ''}${focus.noShow ? ` · ${focus.noShow} לא הגיעו` : ''}`}
      </p>
      <div className="relative mt-3 h-40" onMouseLeave={() => setActive(null)}>
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <div className="absolute inset-0 flex items-end gap-3 border-b border-border">
          {days.map((day, i) => (
            <button
              key={day.date}
              type="button"
              aria-hidden
              tabIndex={-1}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="flex h-full flex-1 items-end justify-center"
            >
              <span
                className={cn(
                  'w-full max-w-10 rounded-t-[4px] bg-chart-bar transition-[height,opacity] duration-500',
                  day.date !== today && i !== active && 'opacity-55',
                )}
                style={{ height: `${(totals[i] / max) * 100}%`, minHeight: totals[i] ? 4 : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-3">
        {days.map((day) => (
          <span key={day.date} className={cn('flex-1 text-center text-caption', day.date === today ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {weekdayShort(fromDayKey(day.date)).replace('יום ', '')}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>תורים לפי יום השבוע</caption>
        <thead>
          <tr>
            <th>יום</th>
            <th>סה״כ</th>
            <th>הושלמו</th>
            <th>לא הגיעו</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => (
            <tr key={day.date}>
              <td>{weekdayShort(fromDayKey(day.date))}</td>
              <td>{totals[i]}</td>
              <td>{day.completed}</td>
              <td>{day.noShow}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
