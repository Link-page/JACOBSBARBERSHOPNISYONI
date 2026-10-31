import { Megaphone } from 'lucide-react'

import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { Panel } from '../../components/field'
import { useAdminQuery } from '../../data/api-context'
import type { BroadcastRecord } from '../../data/types'

/** Sent messages with counts only — never who received them. */
export function BroadcastHistory() {
  const history = useAdminQuery('broadcasts', (api) => api.notifications.history())

  return (
    <Panel title="היסטוריה">
      {!history.data ? (
        <ListSkeleton />
      ) : history.data.length === 0 ? (
        <EmptyState icon={Megaphone} title="עוד לא נשלחו הודעות" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {history.data.map((record) => (
            <HistoryItem key={record.id} record={record} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-footnote text-muted-foreground">„התקבלו" = שירות ההתראות קיבל את ההודעה. זה לא אישור שהיא הוצגה במכשיר.</p>
    </Panel>
  )
}

function HistoryItem({ record }: { record: BroadcastRecord }) {
  const counts = [
    ['נמענים', record.recipients],
    ['התקבלו', record.pushAccepted],
    ['ממתינות', record.pushPending],
    ['נכשלו', record.pushFailed],
  ] as const
  return (
    <li className="rounded-[18px] bg-muted p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-subhead font-semibold">{record.title}</p>
        <p className="shrink-0 text-caption text-muted-foreground">
          {new Date(record.createdAt).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <p className="line-clamp-2 text-footnote text-muted-foreground">{record.body}</p>
      <dl className="mt-2.5 flex flex-wrap gap-1.5">
        {counts.map(([label, value]) => (
          <div key={label} className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-caption">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-caption text-tertiary">
        {record.senderName} · {record.audience === 'upcoming' ? 'לקוחות עם תור קרוב' : 'לקוחות שהסכימו'}
      </p>
    </li>
  )
}
