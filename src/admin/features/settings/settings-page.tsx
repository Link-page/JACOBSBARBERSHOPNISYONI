import { useState } from 'react'

import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { ListSkeleton } from '../../components/empty-state'
import { Field, Panel } from '../../components/field'
import { ImageField } from '../../components/image-field'
import { PageHeader } from '../../components/page-header'
import { useAction } from '../../components/use-action'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import type { BusinessSettings } from '../../data/types'
import { ClosedDatesPanel } from './closed-dates-panel'
import { GalleryPanel } from './gallery-panel'

type NumberKey = 'slotStepMinutes' | 'leadTimeMinutes' | 'bookingWindowDays' | 'cancellationNoticeHours' | 'waitlistOfferMinutes'

const rules: { key: NumberKey; label: string; hint: string }[] = [
  { key: 'slotStepMinutes', label: 'מרווח בין תורים (דקות)', hint: 'כל כמה דקות מוצעת שעת התחלה' },
  { key: 'leadTimeMinutes', label: 'הזמנה מינימלית מראש (דקות)', hint: 'אי אפשר להזמין תור שמתחיל לפני כן' },
  { key: 'bookingWindowDays', label: 'כמה ימים קדימה אפשר להזמין', hint: '1–365' },
  { key: 'cancellationNoticeHours', label: 'ביטול/שינוי עד (שעות לפני)', hint: 'אחרי זה רק הצוות יכול לשנות' },
  { key: 'waitlistOfferMinutes', label: 'תוקף הצעה מרשימת המתנה (דקות)', hint: 'אחרי זה התור מוצע לבא בתור' },
]

/** Business profile, booking rules, policies and the customer app's appearance. */
export function SettingsPage() {
  const current = useAdminQuery('settings', (a) => a.settings.get())
  if (!current.data) return <ListSkeleton />
  // Re-keyed when saved settings change, so the form starts from the server's values.
  return <SettingsForm key={JSON.stringify(current.data)} saved={current.data} />
}

function SettingsForm({ saved }: { saved: BusinessSettings }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const [draft, setDraft] = useState<BusinessSettings>(saved)

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => setDraft({ ...draft, [key]: value })
  const text = (key: 'name' | 'descriptor' | 'address' | 'city' | 'phone' | 'whatsapp' | 'instagram', label: string, ltr = false) => (
    <Field label={label}>{(id) => <Input id={id} dir={ltr ? 'ltr' : undefined} value={draft[key]} onChange={(e) => set(key, e.target.value)} />}</Field>
  )

  return (
    <div>
      <PageHeader
        title="הגדרות"
        subtitle="נשמר בשרת ומשפיע על כל המכשירים."
        actions={
          <Button className="h-10" size="sm" disabled={pending || JSON.stringify(draft) === JSON.stringify(saved)} onClick={() => run(() => api.settings.save(draft), 'ההגדרות נשמרו')}>
            {pending && <Spinner />}
            שמירת שינויים
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="פרטי העסק">
          <div className="grid gap-3 sm:grid-cols-2">
            {text('name', 'שם העסק')}
            {text('descriptor', 'תיאור קצר')}
            {text('address', 'כתובת')}
            {text('city', 'עיר')}
            {text('phone', 'טלפון', true)}
            {text('whatsapp', 'וואטסאפ (מספר בינלאומי)', true)}
            {text('instagram', 'אינסטגרם (שם משתמש)', true)}
            <Field label="לוגו" className="sm:col-span-2">{() => <ImageField value={draft.logoUrl} folder="logo" onChange={(url) => set('logoUrl', url)} />}</Field>
          </div>
        </Panel>
        <Panel title="כללי הזמנה">
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map(({ key, label, hint }) => (
              <Field key={key} label={label} hint={hint}>
                {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={draft[key]} onChange={(e) => set(key, Number(e.target.value))} />}
              </Field>
            ))}
          </div>
        </Panel>
        <Panel title="מדיניות">
          <div className="flex flex-col gap-3">
            <Field label="מדיניות הזמנה">{(id) => <Textarea id={id} value={draft.bookingPolicy} onChange={(e) => set('bookingPolicy', e.target.value)} />}</Field>
            <Field label="מדיניות ביטול">{(id) => <Textarea id={id} value={draft.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value)} />}</Field>
          </div>
        </Panel>
        <Panel title="מראה אפליקציית הלקוחות">
          <SegmentedControl
            id="customer-theme"
            value={draft.appearance.theme}
            onChange={(theme) => set('appearance', { theme })}
            options={[
              { value: 'system', label: 'לפי המכשיר' },
              { value: 'light', label: 'בהיר' },
              { value: 'dark', label: 'כהה' },
            ]}
          />
          <p className="mt-2 text-caption text-muted-foreground">ברירת המחדל ללקוחות שלא בחרו מראה בעצמם.</p>
        </Panel>
        <ClosedDatesPanel />
        <GalleryPanel />
      </div>
    </div>
  )
}
