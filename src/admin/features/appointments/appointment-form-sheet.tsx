import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { Field } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'
import type { Customer } from '../../data/types'
import { BarberServiceFields } from './barber-service-fields'
import { CustomerPicker } from './customer-picker'
import { SlotPicker } from './slot-picker'

export type AppointmentPrefill = { date: string; barberId?: string; startsAt?: string; customer?: Customer }

/** Manual booking by staff (phone call, walk-in). The server validates the time. */
export function AppointmentFormSheet({ prefill, onClose }: { prefill: AppointmentPrefill; onClose: () => void }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const [customer, setCustomer] = useState<Customer | null>(prefill.customer ?? null)
  const [barberId, setBarberId] = useState(prefill.barberId ?? '')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(prefill.date)
  const [startsAt, setStartsAt] = useState<string | null>(prefill.startsAt ?? null)
  const [notes, setNotes] = useState('')
  const ready = customer && barberId && serviceId && startsAt

  const submit = async () => {
    if (!ready) return
    const created = await run(() => api.appointments.create({ customerId: customer.id, barberId, serviceId, startsAt, notes }), 'התור נקבע')
    if (created) onClose()
  }

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="תור חדש"
      footer={
        <Button className="w-full" disabled={!ready || pending} onClick={submit}>
          {pending && <Spinner />}
          קביעת התור
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="לקוח">{() => <CustomerPicker value={customer} onChange={setCustomer} />}</Field>
        <BarberServiceFields
          barberId={barberId}
          serviceId={serviceId}
          onBarber={(id) => {
            setBarberId(id)
            setServiceId('')
          }}
          onService={setServiceId}
        />
        <Field label="תאריך">
          {(id) => <Input id={id} type="date" value={date} onChange={(e) => (setDate(e.target.value), setStartsAt(null))} />}
        </Field>
        <Field label="שעה">{() => <SlotPicker serviceId={serviceId} barberId={barberId} date={date} value={startsAt} onChange={setStartsAt} />}</Field>
        <Field label="הערות">{(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      </div>
    </ResponsiveSheet>
  )
}
