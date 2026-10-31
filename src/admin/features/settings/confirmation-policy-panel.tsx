import { Input, NativeSelect } from '@/components/ui/input'

import { Field, Panel, ToggleRow } from '../../components/field'
import type { BusinessSettings } from '../../data/types'

type Props = { draft: BusinessSettings; set: <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => void }

/** Attendance confirmation and reminders (times are the day before, Israel time). */
export function ConfirmationPolicyPanel({ draft, set }: Props) {
  const invalid = draft.confirmationRequestTime >= draft.confirmationDeadlineTime
  return (
    <Panel title="אישור הגעה ותזכורות">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="שליחת בקשת אישור (יום לפני)" hint="מתי הלקוח מתבקש לאשר">
          {(id) => <Input id={id} type="time" dir="ltr" value={draft.confirmationRequestTime} onChange={(e) => set('confirmationRequestTime', e.target.value)} />}
        </Field>
        <Field label="מועד אחרון לאישור (יום לפני)" hint={invalid ? 'חייב להיות אחרי שעת הבקשה' : 'אחריו תור שלא אושר יבוטל (אם מופעל)'}>
          {(id) => <Input id={id} type="time" dir="ltr" value={draft.confirmationDeadlineTime} onChange={(e) => set('confirmationDeadlineTime', e.target.value)} />}
        </Field>
        <Field label="תורים שנקבעו ברגע האחרון" hint="פחות משעה לפני המועד האחרון, או אחריו — לעולם לא מבוטלים אוטומטית">
          {(id) => (
            <NativeSelect id={id} value={draft.lateBookingPolicy} onChange={(e) => set('lateBookingPolicy', e.target.value as BusinessSettings['lateBookingPolicy'])}>
              <option value="auto_confirm">ההזמנה עצמה נחשבת אישור הגעה</option>
              <option value="exempt">פטורים מאישור הגעה</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="תזכורת לפני התור (דקות)" hint="30–360; נשלחת רק לתורים שאושרו">
          {(id) => <Input id={id} type="number" inputMode="numeric" min={30} max={360} value={draft.reminderMinutesBefore} onChange={(e) => set('reminderMinutesBefore', Number(e.target.value))} />}
        </Field>
      </div>
      <div className="mt-3">
        <ToggleRow label="ביטול אוטומטי של תורים שלא אושרו" hint="הזמן מתפנה, והממתינים לאותו יום מקבלים התראה" checked={draft.autoCancelUnconfirmed} onChange={(v) => set('autoCancelUnconfirmed', v)} />
      </div>
    </Panel>
  )
}
