import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { fromDayKey } from '@/lib/date'

import { useStaff } from '../../auth/staff-context'
import { Field } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import type { WaitlistEntry } from '../../data/types'
import { visibleBarbers } from '../../lib/permissions'
import { SlotPicker } from '../appointments/slot-picker'

/** Offers a specific free slot to a waiting customer; it is held for them until the offer expires. */
export function OfferSheet({ entry, onClose }: { entry: WaitlistEntry; onClose: () => void }) {
  const api = useAdminApi()
  const staff = useStaff()
  const { barbers, serviceName } = useCatalogue()
  const { run, pending } = useAction()
  const chairs = visibleBarbers(staff, barbers).filter((b) => b.active && (!entry.barberId || b.id === entry.barberId))
  const [barberId, setBarberId] = useState(entry.barberId ?? chairs[0]?.id ?? '')
  const [startsAt, setStartsAt] = useState<string | null>(null)

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={`הצעת תור ל${entry.customerName ?? 'לקוח'}`}
      description={`${serviceName(entry.serviceId)} · ${fromDayKey(entry.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      footer={
        <Button
          className="w-full"
          disabled={!startsAt || pending}
          onClick={async () => {
            if (startsAt && (await run(() => api.waitlist.offer(entry.id, startsAt, barberId), 'ההצעה נשמרה'))) onClose()
          }}
        >
          {pending && <Spinner />}
          הצעת התור
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {!entry.barberId && chairs.length > 1 && (
          <Field label="ספר">
            {(id) => (
              <NativeSelect id={id} value={barberId} onChange={(e) => (setBarberId(e.target.value), setStartsAt(null))}>
                {chairs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
        <Field label="שעה">{() => <SlotPicker serviceId={entry.serviceId} barberId={barberId} date={entry.date} value={startsAt} onChange={setStartsAt} />}</Field>
      </div>
    </ResponsiveSheet>
  )
}
