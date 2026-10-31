import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { Field } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'
import type { Customer } from '../../data/types'

/** Adds a customer, or edits one (owner). Adding returns the existing record if the phone is known. */
export function CustomerFormSheet({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const [name, setName] = useState(customer?.fullName ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')

  const submit = async () => {
    const result = customer
      ? await run(() => api.customers.update(customer.id, { fullName: name.trim(), phone: phone.trim() || null }), 'הפרטים עודכנו')
      : await run(() => api.customers.upsert(name, phone.trim() || null), 'הלקוח נשמר')
    if (result) onClose()
  }

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={customer ? 'עריכת לקוח' : 'לקוח חדש'}
      footer={
        <Button className="w-full" disabled={!name.trim() || pending} onClick={submit}>
          {pending && <Spinner />}
          שמירה
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שם מלא">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="טלפון" hint="משמש לזיהוי לקוח קיים בהזמנות טלפוניות.">
          {(id) => <Input id={id} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
      </div>
    </ResponsiveSheet>
  )
}
