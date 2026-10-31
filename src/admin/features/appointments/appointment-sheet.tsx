import { CalendarClock, Check, History, Phone, UserX, X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { formatDuration, formatPrice, fullDate } from '@/lib/format'
import { spring } from '@/lib/motion'

import { useStaff } from '../../auth/staff-context'
import { Field } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { AttendanceInfo } from './attendance-info'
import { StatusBadge } from '../../components/status-badge'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import type { Appointment } from '../../data/types'
import { canManageBarber, isOwner } from '../../lib/permissions'
import { SlotPicker } from './slot-picker'
import { dateOf, minutesBetween, timeOf } from './time'

type Mode = 'details' | 'reschedule' | 'cancel'

/** Everything about one appointment, with the actions this staff member may take. */
export function AppointmentSheet({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const api = useAdminApi()
  const staff = useStaff()
  const { barberName, serviceName, barber } = useCatalogue()
  const { run, pending } = useAction()
  const [mode, setMode] = useState<Mode>('details')
  const [notes, setNotes] = useState(appointment.notes)
  const [serviceId, setServiceId] = useState(appointment.serviceId)
  const [date, setDate] = useState(dateOf(appointment.startsAt))
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const history = useAdminQuery(showHistory ? `history|${appointment.id}` : null, (a) => a.appointments.history(appointment.id))

  const editable = appointment.status === 'booked' && canManageBarber(staff, appointment.barberId)
  const offered = barber(appointment.barberId)?.services.map((s) => s.serviceId) ?? []
  const act = async (action: () => Promise<unknown>, message: string) => {
    if (await run(action, message)) onClose()
  }

  const rows = [
    ['טיפול', serviceName(appointment.serviceId)],
    ['ספר', barberName(appointment.barberId)],
    ['תאריך', fullDate(new Date(appointment.startsAt))],
    ['שעה', `${timeOf(appointment.startsAt)}–${timeOf(appointment.endsAt)}`],
    ['משך', formatDuration(minutesBetween(appointment.startsAt, appointment.endsAt))],
    ['מחיר', formatPrice(appointment.price)],
  ]

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={appointment.customerName}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={spring}>
          {mode === 'details' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={appointment.status} />
                {appointment.customerPhone && (
                  <a href={`tel:${appointment.customerPhone}`} className="inline-flex items-center gap-1.5 text-subhead font-medium text-brass" dir="ltr">
                    <Phone className="size-4" />
                    {appointment.customerPhone}
                  </a>
                )}
              </div>
              <dl className="divide-y rounded-[18px] bg-muted px-4">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2.5 text-subhead">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular">{value}</dd>
                  </div>
                ))}
              </dl>
              <AttendanceInfo appointment={appointment} onChanged={() => onClose()} />

              {editable && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" disabled={pending} onClick={() => act(() => api.appointments.setStatus(appointment.id, 'completed'), 'סומן כהושלם')}>
                      <Check />
                      הושלם
                    </Button>
                    <Button variant="secondary" disabled={pending} onClick={() => act(() => api.appointments.setStatus(appointment.id, 'no_show'), 'סומן שלא הגיע')}>
                      <UserX />
                      לא הגיע
                    </Button>
                    <Button variant="secondary" onClick={() => setMode('reschedule')}>
                      <CalendarClock />
                      שינוי מועד
                    </Button>
                    <Button variant="destructive" onClick={() => setMode('cancel')}>
                      <X />
                      ביטול
                    </Button>
                  </div>
                  <Field label="טיפול">
                    {(id) => (
                      <NativeSelect id={id} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                        {offered.map((sid) => (
                          <option key={sid} value={sid}>
                            {serviceName(sid)}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </Field>
                </>
              )}
              {appointment.status !== 'booked' && canManageBarber(staff, appointment.barberId) && appointment.status !== 'cancelled' && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    act(() => api.appointments.setStatus(appointment.id, appointment.status === 'completed' ? 'no_show' : 'completed'), 'הסטטוס עודכן')
                  }
                >
                  תיקון: {appointment.status === 'completed' ? 'לא הגיע' : 'הושלם'}
                </Button>
              )}
              <Field label="הערות">
                {(id) => <Textarea id={id} value={notes} disabled={!canManageBarber(staff, appointment.barberId)} onChange={(e) => setNotes(e.target.value)} />}
              </Field>
              {(notes !== appointment.notes || serviceId !== appointment.serviceId) && (
                <Button
                  disabled={pending}
                  onClick={() =>
                    act(
                      () => api.appointments.update(appointment.id, { notes, serviceId: serviceId !== appointment.serviceId ? serviceId : undefined }),
                      'השינויים נשמרו',
                    )
                  }
                >
                  שמירת שינויים
                </Button>
              )}

              {isOwner(staff) || canManageBarber(staff, appointment.barberId) ? (
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
                    <History />
                    היסטוריית שינויים
                  </Button>
                  {showHistory && (
                    <ul className="mt-2 flex flex-col gap-1.5 text-footnote text-muted-foreground">
                      {history.data?.length === 0 && <li>אין שינויים רשומים.</li>}
                      {history.data?.map((h) => (
                        <li key={h.id} className="flex justify-between gap-3 rounded-[12px] bg-muted px-3 py-2">
                          <span>{h.action === 'insert' ? 'נוצר' : h.action === 'update' ? `עודכן: ${Object.keys(h.details).join(', ')}` : h.action}</span>
                          <span className="tabular" dir="ltr">
                            {new Date(h.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {mode === 'reschedule' && (
            <div className="flex flex-col gap-4">
              <Field label="תאריך חדש">
                {(id) => <Input id={id} type="date" value={date} onChange={(e) => (setDate(e.target.value), setStartsAt(null))} />}
              </Field>
              <Field label="שעה">
                {() => <SlotPicker serviceId={appointment.serviceId} barberId={appointment.barberId} date={date} value={startsAt} onChange={setStartsAt} />}
              </Field>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!startsAt || pending}
                  onClick={() => startsAt && act(() => api.appointments.reschedule(appointment.id, startsAt), 'המועד עודכן')}
                >
                  אישור המועד
                </Button>
                <Button variant="secondary" onClick={() => setMode('details')}>
                  חזרה
                </Button>
              </div>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="flex flex-col gap-4">
              <p className="text-subhead text-muted-foreground">
                הזמן יתפנה, וממתינים ברשימת ההמתנה ליום הזה יקבלו הצעה לפי סדר ההרשמה.
              </p>
              <Field label="סיבת הביטול (אופציונלי)">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" disabled={pending} onClick={() => act(() => api.appointments.cancel(appointment.id, reason), 'התור בוטל')}>
                  ביטול התור
                </Button>
                <Button variant="secondary" onClick={() => setMode('details')}>
                  חזרה
                </Button>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </ResponsiveSheet>
  )
}
