import { Hourglass, RefreshCw } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { useNow } from '@/hooks/use-now'
import { addDays, dayKey, fromDayKey } from '@/lib/date'
import { groupBy } from '@/lib/group-by'

import { useStaff } from '../../auth/staff-context'
import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { PageHeader } from '../../components/page-header'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import { visibleBarbers } from '../../lib/permissions'
import { WaitlistEntryCard } from './waitlist-entry-card'

/** Customers waiting for full days, oldest first within each date. */
export function WaitlistPage() {
  const api = useAdminApi()
  const staff = useStaff()
  const now = useNow(60_000)
  const today = dayKey(now)
  const { barbers } = useCatalogue()
  const { run, pending } = useAction()
  const [barber, setBarber] = useState('all')
  const entries = useAdminQuery(`waitlist|${today}`, (a) => a.waitlist.list({ from: today, to: dayKey(addDays(now, 61)) }))
  const chairs = visibleBarbers(staff, barbers).filter((b) => b.active)

  const shown = (entries.data ?? []).filter((e) => barber === 'all' || e.barberId === barber || e.barberId === null)
  const byDate = groupBy(shown, (e) => e.date)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
      <div>
        <PageHeader
          title="רשימת המתנה"
          subtitle="לקוחות שביקשו יום מלא. כשמתפנה זמן, כולם מקבלים התראה — מי שקובע ראשון מקבל את התור."
          actions={
            <>
              {chairs.length > 1 && (
                <NativeSelect aria-label="סינון לפי ספר" className="h-10 w-auto" value={barber} onChange={(e) => setBarber(e.target.value)}>
                  <option value="all">כל הצוות</option>
                  {chairs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
              <Button size="sm" variant="secondary" className="h-10" disabled={pending} onClick={() => run(() => api.waitlist.runMaintenance(), 'התזמונים הורצו')}>
                <RefreshCw />
                הרצת תזמונים עכשיו
              </Button>
            </>
          }
        />
        {!entries.data ? (
          <ListSkeleton />
        ) : byDate.size === 0 ? (
          <EmptyState icon={Hourglass} title="אין ממתינים">
            כשיום מתמלא, לקוחות יכולים להצטרף לרשימת ההמתנה שלו מהאפליקציה.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-6">
            {[...byDate.entries()].map(([date, list]) => (
              <section key={date}>
                <h2 className="mb-2.5 font-display text-headline font-medium">
                  {fromDayKey(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <span className="ms-2 text-footnote text-muted-foreground tabular">{list.length} ממתינים</span>
                </h2>
                <ul className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {list.map((entry) => (
                      <WaitlistEntryCard
                        key={entry.id}
                        entry={entry}
                        onRemove={() => run(() => api.waitlist.remove(entry.id), 'הוסר מהרשימה')}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
