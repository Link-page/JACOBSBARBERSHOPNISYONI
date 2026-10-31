import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { Field, ToggleRow } from '../../components/field'
import { ImageField } from '../../components/image-field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import type { Barber } from '../../data/types'
import { AccountAccess } from './account-access'
import { BarberServicesEditor } from './barber-services-editor'
import { BreaksEditor } from './breaks-editor'
import { WeeklyHoursEditor } from './weekly-hours-editor'

type Draft = Omit<Barber, 'id' | 'linkedUserId'> & { id?: string }

const emptyBarber = (sortOrder: number): Draft => ({
  name: '',
  bio: '',
  photoUrl: null,
  active: true,
  sortOrder,
  services: [],
  hours: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: '09:00', end: '18:00' })),
  breaks: [],
})

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border p-3.5">
      <h3 className="mb-2 text-subhead font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/** Profile, services, weekly schedule and account access for one barber. */
export function BarberEditorSheet({ barber, onClose }: { barber?: Barber; onClose: () => void }) {
  const api = useAdminApi()
  const { services, barbers } = useCatalogue()
  const { run, pending } = useAction()
  const [draft, setDraft] = useState<Draft>(barber ?? emptyBarber(barbers.length))
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const invalid = !draft.name.trim() || [...draft.hours, ...draft.breaks].some((r) => r.end <= r.start)

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={barber ? barber.name : 'ספר חדש'}
      description="ימי חופש קבועים: כבו את היום. חופשות ותאריכים מסוימים: חסימת זמן ביומן."
      footer={
        <Button className="w-full" disabled={invalid || pending} onClick={async () => (await run(() => api.barbers.save({ ...draft, name: draft.name.trim() }), 'הפרטים נשמרו')) && onClose()}>
          {pending && <Spinner />}
          שמירה
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שם">{(id) => <Input id={id} value={draft.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="תמונה">{() => <ImageField value={draft.photoUrl} folder="barbers" onChange={(url) => set('photoUrl', url)} />}</Field>
        <Field label="ביוגרפיה">{(id) => <Textarea id={id} value={draft.bio} onChange={(e) => set('bio', e.target.value)} />}</Field>
        <ToggleRow label="פעיל" hint="ספר לא פעיל לא מוצג ללקוחות ולא מקבל תורים" checked={draft.active} onChange={(v) => set('active', v)} />
        <Group title="טיפולים">
          <BarberServicesEditor services={services} value={draft.services} onChange={(v) => set('services', v)} />
        </Group>
        <Group title="שעות עבודה">
          <WeeklyHoursEditor value={draft.hours} onChange={(v) => set('hours', v)} />
        </Group>
        <Group title="הפסקות קבועות">
          <BreaksEditor value={draft.breaks} onChange={(v) => set('breaks', v)} />
        </Group>
        {barber && (
          <Group title="גישה לניהול">
            <AccountAccess barberId={barber.id} linked={!!barber.linkedUserId} />
          </Group>
        )}
        {invalid && draft.name.trim() && <p className="text-footnote text-destructive">שעת הסיום חייבת להיות אחרי שעת ההתחלה.</p>}
      </div>
    </ResponsiveSheet>
  )
}
