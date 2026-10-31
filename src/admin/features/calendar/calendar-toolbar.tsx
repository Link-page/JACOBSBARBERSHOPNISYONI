import { Ban, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'

import type { Barber } from '../../data/types'
import type { CalendarView } from './calendar-range'

type ToolbarProps = {
  view: CalendarView
  title: string
  barbers: Barber[]
  barberId: string
  onView: (view: CalendarView) => void
  onShift: (delta: number) => void
  onToday: () => void
  onBarber: (id: string) => void
  onNew: () => void
  onBlock: () => void
}

export function CalendarToolbar(props: ToolbarProps) {
  const { view, title, barbers, barberId } = props
  return (
    <div className="mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        {/* Arrows follow the reading direction: in RTL, "previous" points right. */}
        <Button size="icon" variant="secondary" aria-label="הקודם" onClick={() => props.onShift(-1)}>
          <ChevronLeft className="rtl:-scale-x-100" />
        </Button>
        <Button size="icon" variant="secondary" aria-label="הבא" onClick={() => props.onShift(1)}>
          <ChevronRight className="rtl:-scale-x-100" />
        </Button>
        <Button size="sm" variant="secondary" onClick={props.onToday}>
          היום
        </Button>
        <h2 className="ms-2 truncate font-display text-title3 font-medium" aria-live="polite">
          {title}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          id="calendar-view"
          className="w-full sm:w-64"
          value={view}
          onChange={props.onView}
          options={[
            { value: 'day', label: 'יום' },
            { value: 'week', label: 'שבוע' },
            { value: 'month', label: 'חודש' },
          ]}
        />
        {barbers.length > 1 && (
          <NativeSelect aria-label="ספר" className="h-10 w-auto" value={barberId} onChange={(e) => props.onBarber(e.target.value)}>
            <option value="all">כל הצוות</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button size="sm" variant="secondary" className="h-10" onClick={props.onBlock}>
          <Ban />
          חסימה
        </Button>
        <Button size="sm" className="h-10" onClick={props.onNew}>
          <Plus />
          תור חדש
        </Button>
      </div>
    </div>
  )
}
