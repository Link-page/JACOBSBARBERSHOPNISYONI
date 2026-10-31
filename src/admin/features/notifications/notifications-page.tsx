import { PageHeader } from '../../components/page-header'
import { BroadcastComposer } from './broadcast-composer'
import { BroadcastHistory } from './broadcast-history'

/** Messages to customers: compose with preview, then history with counts. */
export function NotificationsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="התראות" subtitle="הודעות ללקוחות. בקשות אישור, תזכורות ועדכוני רשימת המתנה נשלחים אוטומטית." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <BroadcastComposer />
        <BroadcastHistory />
      </div>
    </div>
  )
}
