import { ToggleRow } from '../../components/field'
import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'

/** Owner only: whether this barber's account may send messages to customers. */
export function BroadcastPermission({ userId, allowed }: { userId: string; allowed: boolean }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  return (
    <ToggleRow
      label="רשאי לשלוח הודעות ללקוחות"
      hint="רק ללקוחות שלו עם תור קרוב, או לכל מי שהסכים לקבל הודעות"
      checked={allowed}
      onChange={(value) => !pending && void run(() => api.barbers.setBroadcastPermission(userId, value), value ? 'ההרשאה ניתנה' : 'ההרשאה בוטלה')}
    />
  )
}
