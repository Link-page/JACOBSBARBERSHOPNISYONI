import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { addDays, dayKey, fromDayKey } from '@/lib/date'

import { useStaff } from '../../auth/staff-context'
import { Field, ToggleRow } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import { isOwner, visibleBarbers } from '../../lib/permissions'
import { toIso } from './time'

/** Blocks time for one barber, or (owner only) closes the whole shop. */
export function BlockTimeSheet({ date: initialDate, onClose }: { date: string; onClose: () => void }) {
  const api = useAdminApi()
  const staff = useStaff()
  const { barbers } = useCatalogue()
  const { run, pending } = useAction()
  const chairs = visibleBarbers(staff, barbers)
  const [barberId, setBarberId] = useState(staff.barberId ?? chairs[0]?.id ?? '')
  const [date, setDate] = useState(initialDate)
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState('12:00')
  const [end, setEnd] = useState('13:00')
  const [reason, setReason] = useState('')

  const submit = async () => {
    const range = allDay
      ? { startsAt: toIso(date, '00:00'), endsAt: toIso(dayKey(addDays(fromDayKey(date), 1)), '00:00') }
      : { startsAt: toIso(date, start), endsAt: toIso(date, end) }
    const saved = await run(() => api.schedule.addBlock({ barberId: barberId === 'shop' ? null : barberId, reason, ...range }), 'הזמן נחסם')
    if (saved) onClose()
  }

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="חסימת זמן"
      description="זמן חסום לא יוצע ללקוחות. תורים קיימים לא מבוטלים אוטומטית."
      footer={
        <Button className="w-full" disabled={pending || (!allDay && end <= start) || !barberId} onClick={submit}>
          {pending && <Spinner />}
          חסימה
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="עבור">
          {(id) => (
            <NativeSelect id={id} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              {chairs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              {isOwner(staff) && <option value="shop">כל המספרה (יום סגור)</option>}
            </NativeSelect>
          )}
        </Field>
        <Field label="תאריך">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        <ToggleRow label="כל היום" checked={allDay} onChange={setAllDay} />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="משעה">{(id) => <Input id={id} type="time" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
            <Field label="עד שעה">{(id) => <Input id={id} type="time" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
          </div>
        )}
        <Field label="סיבה (פנימי)">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </div>
    </ResponsiveSheet>
  )
}
