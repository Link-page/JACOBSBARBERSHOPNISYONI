import { CalendarPlus, Pencil, Phone } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useNow } from '@/hooks/use-now'
import { dayKey } from '@/lib/date'
import { formatPrice } from '@/lib/format'

import { useStaff } from '../../auth/staff-context'
import { ListSkeleton } from '../../components/empty-state'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { StatusBadge } from '../../components/status-badge'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import type { Appointment } from '../../data/types'
import { isOwner } from '../../lib/permissions'
import { useAppointmentSheets } from '../appointments/use-appointment-sheets'
import { timeOf } from '../appointments/time'
import { CustomerFormSheet } from './customer-form-sheet'

function VisitList({ title, items }: { title: string; items: Appointment[] }) {
  const { serviceName } = useCatalogue()
  const { showAppointment } = useAppointmentSheets()
  if (!items.length) return null
  return (
    <section>
      <h3 className="mb-2 text-subhead font-semibold">
        {title} <span className="text-muted-foreground tabular">({items.length})</span>
      </h3>
      <ul className="divide-y rounded-[16px] bg-muted">
        {items.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => showAppointment(a)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-start">
              <span className="w-20 text-footnote tabular">{new Date(a.startsAt).toLocaleDateString('he-IL')}</span>
              <span className="min-w-0 flex-1 truncate text-subhead">
                {timeOf(a.startsAt)} · {serviceName(a.serviceId)}
              </span>
              <StatusBadge status={a.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One customer: contact, visit history and staff notes. */
export function CustomerDetailSheet({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const api = useAdminApi()
  const staff = useStaff()
  const now = useNow(60_000)
  const sheets = useAppointmentSheets()
  const { run, pending } = useAction()
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const detail = useAdminQuery(`customer|${customerId}`, (a) => a.customers.get(customerId))
  const data = detail.data

  const upcoming = data?.appointments.filter((a) => a.status === 'booked' && new Date(a.startsAt) >= now).reverse() ?? []
  const past = data?.appointments.filter((a) => a.status === 'completed' || a.status === 'no_show') ?? []
  const cancelled = data?.appointments.filter((a) => a.status === 'cancelled') ?? []
  const spent = past.filter((a) => a.status === 'completed').reduce((sum, a) => sum + a.price, 0)

  return (
    <>
      <ResponsiveSheet open={!editing} onOpenChange={(open) => !open && onClose()} title={data?.customer.fullName ?? 'לקוח'}>
        {!data ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {data.customer.phone && (
                <Button asChild size="sm" variant="secondary">
                  <a href={`tel:${data.customer.phone}`} dir="ltr">
                    <Phone />
                    {data.customer.phone}
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={() => sheets.newAppointment({ date: dayKey(now), customer: data.customer })}>
                <CalendarPlus />
                תור חדש
              </Button>
              {isOwner(staff) && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil />
                  עריכה
                </Button>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['ביקורים', String(past.filter((a) => a.status === 'completed').length)],
                ['לא הגיע', String(past.filter((a) => a.status === 'no_show').length)],
                ['סה״כ', formatPrice(spent)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] bg-muted py-2.5">
                  <dd className="font-display text-title3 font-medium tabular">{value}</dd>
                  <dt className="text-caption text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
            <VisitList title="תורים קרובים" items={upcoming} />
            <VisitList title="היסטוריה" items={past} />
            <VisitList title="בוטלו" items={cancelled} />
            <section>
              <h3 className="mb-2 text-subhead font-semibold">הערות צוות</h3>
              <p className="mb-2 text-caption text-muted-foreground">גלויות לצוות בלבד, לא ללקוח.</p>
              <div className="flex gap-2">
                <Textarea className="min-h-12" value={note} onChange={(e) => setNote(e.target.value)} aria-label="הערה חדשה" />
                <Button
                  size="sm"
                  className="self-end"
                  disabled={!note.trim() || pending}
                  onClick={async () => {
                    if ((await run(() => api.customers.addNote(customerId, note.trim()), 'ההערה נשמרה')) !== null) setNote('')
                  }}
                >
                  הוספה
                </Button>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {data.notes.map((n) => (
                  <li key={n.id} className="rounded-[14px] bg-muted px-3.5 py-2.5 text-subhead">
                    {n.body}
                    <span className="mt-0.5 block text-caption text-muted-foreground">{new Date(n.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </ResponsiveSheet>
      {editing && data && <CustomerFormSheet customer={data.customer} onClose={() => setEditing(false)} />}
    </>
  )
}
