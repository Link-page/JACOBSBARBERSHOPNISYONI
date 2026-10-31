import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNow } from '@/hooks/use-now'
import { addDays, dayKey, fromDayKey } from '@/lib/date'

import { Panel } from '../../components/field'
import { useAction } from '../../components/use-action'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import { toIso } from '../appointments/time'

/** Days the whole shop is closed (holidays, renovation) — stored as shop-wide time blocks. */
export function ClosedDatesPanel() {
  const api = useAdminApi()
  const now = useNow(60_000)
  const today = dayKey(now)
  const { run, pending } = useAction()
  const [date, setDate] = useState(today)
  const [reason, setReason] = useState('')
  const blocks = useAdminQuery(`closed|${today}`, (a) => a.schedule.blocks({ from: today, to: dayKey(addDays(now, 366)) }))
  const closed = (blocks.data ?? []).filter((b) => b.barberId === null)

  return (
    <Panel title="ימים סגורים">
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="h-10 w-auto" value={date} onChange={(e) => setDate(e.target.value)} aria-label="תאריך" />
        <Input className="h-10 min-w-0 flex-1" placeholder="סיבה (למשל חג)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="סיבה" />
        <Button
          size="sm"
          className="h-10"
          disabled={pending}
          onClick={() =>
            run(
              () => api.schedule.addBlock({ barberId: null, startsAt: toIso(date, '00:00'), endsAt: toIso(dayKey(addDays(fromDayKey(date), 1)), '00:00'), reason }),
              'היום סומן כסגור',
            ).then(() => setReason(''))
          }
        >
          הוספה
        </Button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {closed.length === 0 && <li className="text-footnote text-muted-foreground">אין ימים סגורים בשנה הקרובה.</li>}
        {closed.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-[14px] bg-muted px-3.5 py-2">
            <span className="text-subhead">
              {new Date(b.startsAt).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              {b.reason && <span className="text-muted-foreground"> · {b.reason}</span>}
            </span>
            <Button size="icon" variant="ghost" aria-label="הסרה" disabled={pending} onClick={() => run(() => api.schedule.removeBlock(b.id), 'הוסר')}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
