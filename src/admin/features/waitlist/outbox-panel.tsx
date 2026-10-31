import { Info } from 'lucide-react'

import { Panel } from '../../components/field'
import { useAdminQuery } from '../../data/api-context'

/** Messages queued for customers. Shown honestly: nothing is sent until a provider is connected. */
export function OutboxPanel() {
  const outbox = useAdminQuery('outbox', (api) => api.waitlist.outbox())
  const pending = (outbox.data ?? []).filter((m) => m.status === 'pending')

  return (
    <Panel title="הודעות ללקוחות">
      <p className="flex gap-2 rounded-[16px] bg-muted px-3.5 py-3 text-footnote text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        עדיין לא חובר ספק SMS או WhatsApp, ולכן הודעות על תורים שהתפנו נשמרות כממתינות ולא נשלחות. צרו קשר עם הלקוחות בטלפון.
      </p>
      {pending.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {pending.slice(0, 8).map((message) => (
            <li key={message.id} className="rounded-[14px] border px-3.5 py-2.5 text-footnote">
              <span className="me-2 rounded-full bg-muted px-2 py-0.5 text-caption2 font-semibold text-muted-foreground">ממתינה · לא נשלחה</span>
              {message.message}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
