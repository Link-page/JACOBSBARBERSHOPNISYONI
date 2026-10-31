import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type { WeeklyRange } from '../../data/types'
import { weekdayNames } from './weekdays'


/** One row per weekday: working or day off, with opening and closing time. */
export function WeeklyHoursEditor({ value, onChange }: { value: WeeklyRange[]; onChange: (hours: WeeklyRange[]) => void }) {
  const set = (weekday: number, next: WeeklyRange | null) =>
    onChange([...value.filter((h) => h.weekday !== weekday), ...(next ? [next] : [])].sort((a, b) => a.weekday - b.weekday))

  return (
    <div className="flex flex-col divide-y">
      {weekdayNames.map((name, weekday) => {
        const day = value.find((h) => h.weekday === weekday)
        return (
          <div key={weekday} className="flex items-center gap-3 py-2">
            <Switch checked={!!day} onCheckedChange={(on) => set(weekday, on ? { weekday, start: '09:00', end: '18:00' } : null)} aria-label={`עבודה ביום ${name}`} />
            <span className="w-14 text-subhead">{name}</span>
            {day ? (
              <div className="flex flex-1 items-center gap-2" dir="ltr">
                <Input type="time" className="h-10" value={day.start} onChange={(e) => set(weekday, { ...day, start: e.target.value })} aria-label={`פתיחה ביום ${name}`} />
                <span className="text-muted-foreground">–</span>
                <Input type="time" className="h-10" value={day.end} onChange={(e) => set(weekday, { ...day, end: e.target.value })} aria-label={`סגירה ביום ${name}`} />
              </div>
            ) : (
              <span className="text-footnote text-muted-foreground">יום חופש</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
