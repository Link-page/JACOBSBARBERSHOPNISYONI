import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'

import type { WeeklyRange } from '../../data/types'
import { weekdayNames } from './weekdays'

/** Recurring weekly breaks (lunch, prayer, school run). */
export function BreaksEditor({ value, onChange }: { value: WeeklyRange[]; onChange: (breaks: WeeklyRange[]) => void }) {
  const update = (index: number, next: WeeklyRange) => onChange(value.map((b, i) => (i === index ? next : b)))

  return (
    <div className="flex flex-col gap-2">
      {value.map((b, index) => (
        <div key={index} className="flex items-center gap-2">
          <NativeSelect className="h-10 w-28" value={b.weekday} onChange={(e) => update(index, { ...b, weekday: Number(e.target.value) })} aria-label="יום">
            {weekdayNames.map((name, weekday) => (
              <option key={weekday} value={weekday}>
                {name}
              </option>
            ))}
          </NativeSelect>
          <div className="flex flex-1 items-center gap-1.5" dir="ltr">
            <Input type="time" className="h-10" value={b.start} onChange={(e) => update(index, { ...b, start: e.target.value })} aria-label="תחילת הפסקה" />
            <Input type="time" className="h-10" value={b.end} onChange={(e) => update(index, { ...b, end: e.target.value })} aria-label="סוף הפסקה" />
          </div>
          <Button size="icon" variant="ghost" aria-label="מחיקת הפסקה" onClick={() => onChange(value.filter((_, i) => i !== index))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" className="self-start" onClick={() => onChange([...value, { weekday: 0, start: '13:00', end: '13:30' }])}>
        <Plus />
        הוספת הפסקה
      </Button>
    </div>
  )
}
