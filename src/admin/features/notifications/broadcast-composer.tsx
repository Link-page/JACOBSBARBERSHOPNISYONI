import { Send } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { useStaff } from '../../auth/staff-context'
import { Field, Panel } from '../../components/field'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'
import type { BroadcastAudience } from '../../data/types'
import { isOwner } from '../../lib/permissions'
import { NotificationPreview } from './notification-preview'
import { BODY_MAX, TITLE_MAX, useBroadcastDraft } from './use-broadcast-draft'

const audienceLabel: Record<BroadcastAudience, string> = {
  opted_in: 'כל הלקוחות שהסכימו לקבל הודעות',
  upcoming: 'לקוחות עם תור בשבוע הקרוב',
}

/** Write, preview, confirm, send. The database checks permission, consent and limits. */
export function BroadcastComposer() {
  const api = useAdminApi()
  const staff = useStaff()
  const draft = useBroadcastDraft()
  const { run, pending } = useAction()
  const [confirming, setConfirming] = useState(false)
  const upcomingLabel = isOwner(staff) ? audienceLabel.upcoming : 'הלקוחות שלי עם תור בשבוע הקרוב'

  const send = async () => {
    const result = await run(
      () => api.notifications.send({ title: draft.title, body: draft.body, audience: draft.audience, link: null, idempotencyKey: draft.key }),
      'ההודעה נשלחה',
    )
    if (result) {
      setConfirming(false)
      draft.reset()
    }
  }

  return (
    <Panel title="הודעה חדשה">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-3">
          <Field label="כותרת" hint={`${draft.title.length}/${TITLE_MAX}`}>
            {(id) => <Input id={id} maxLength={TITLE_MAX} value={draft.title} onChange={(e) => draft.setTitle(e.target.value)} placeholder="למשל: סגור מחר" />}
          </Field>
          <Field label="טקסט" hint={`${draft.body.length}/${BODY_MAX}`}>
            {(id) => <Textarea id={id} maxLength={BODY_MAX} value={draft.body} onChange={(e) => draft.setBody(e.target.value)} placeholder="מה חשוב שהלקוחות יידעו?" />}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-footnote font-medium text-muted-foreground">למי</legend>
            {(['opted_in', 'upcoming'] as const).map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-[14px] bg-muted px-3.5 py-3 text-subhead has-checked:ring-2 has-checked:ring-brass/60">
                <input type="radio" name="audience" value={value} checked={draft.audience === value} onChange={() => draft.setAudience(value)} className="accent-[var(--brass)]" />
                {value === 'upcoming' ? upcomingLabel : audienceLabel.opted_in}
              </label>
            ))}
          </fieldset>
          <p className="text-footnote text-muted-foreground">
            ההודעה נשמרת במרכז ההתראות של כל לקוח, ונשלחת כהתראה למכשירים שהפעילו התראות. משלוח לשירות ההתראות אינו אישור שההודעה הוצגה במכשיר.
          </p>
          <Button className="h-11 self-start" disabled={!draft.valid} onClick={() => setConfirming(true)}>
            <Send className="size-4" />
            המשך לשליחה
          </Button>
        </div>
        {/* Sized to its content, not stretched to the form's height. */}
        <NotificationPreview title={draft.title} body={draft.body} className="lg:sticky lg:top-6 lg:self-start" />
      </div>

      <ResponsiveSheet
        open={confirming}
        onOpenChange={setConfirming}
        title="לשלוח את ההודעה?"
        description={draft.audience === 'upcoming' ? upcomingLabel : audienceLabel.opted_in}
        footer={
          <div className="flex gap-2">
            <Button className="flex-1" disabled={pending} onClick={() => void send()}>
              {pending && <Spinner />}
              שליחה עכשיו
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              חזרה
            </Button>
          </div>
        }
      >
        <NotificationPreview title={draft.title} body={draft.body} />
      </ResponsiveSheet>
    </Panel>
  )
}
