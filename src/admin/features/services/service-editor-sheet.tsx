import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { Field, ToggleRow } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import type { Service } from '../../data/types'

/** Create or edit a service: details, price, length, and which barbers offer it. */
export function ServiceEditorSheet({ service, onClose }: { service?: Service; onClose: () => void }) {
  const api = useAdminApi()
  const { barbers } = useCatalogue()
  const { run, pending } = useAction()
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 30))
  const [price, setPrice] = useState(String(service?.price ?? 0))
  const [active, setActive] = useState(service?.active ?? true)
  const [assigned, setAssigned] = useState<string[]>(
    service ? barbers.filter((b) => b.services.some((s) => s.serviceId === service.id)).map((b) => b.id) : barbers.filter((b) => b.active).map((b) => b.id),
  )
  const valid = name.trim() && Number(duration) >= 5 && Number(duration) <= 480 && Number(price) >= 0

  const save = async () => {
    const saved = await run(
      () =>
        api.services.save(
          { id: service?.id, name: name.trim(), description: description.trim(), durationMinutes: Number(duration), price: Number(price), active },
          assigned,
        ),
      'הטיפול נשמר',
    )
    if (saved) onClose()
  }

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={service ? 'עריכת טיפול' : 'טיפול חדש'}
      footer={
        <Button className="w-full" disabled={!valid || pending} onClick={save}>
          {pending && <Spinner />}
          שמירה
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שם">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="תיאור">{(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="משך (דקות)" hint="5–480">
            {(id) => <Input id={id} type="number" inputMode="numeric" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />}
          </Field>
          <Field label="מחיר (₪)">{(id) => <Input id={id} type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />}</Field>
        </div>
        <ToggleRow label="מוצג ללקוחות" hint="טיפול כבוי לא יוצע להזמנה" checked={active} onChange={setActive} />
        <fieldset>
          <legend className="mb-2 text-footnote font-medium text-muted-foreground">מבוצע על ידי</legend>
          <div className="flex flex-wrap gap-2">
            {barbers.map((b) => {
              const on = assigned.includes(b.id)
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAssigned((list) => (on ? list.filter((x) => x !== b.id) : [...list, b.id]))}
                  className={on ? 'h-9 rounded-full bg-primary px-4 text-subhead font-medium text-primary-foreground' : 'h-9 rounded-full bg-muted px-4 text-subhead'}
                >
                  {b.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
    </ResponsiveSheet>
  )
}
