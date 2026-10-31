import { Search, UserPlus, Users } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { PageHeader } from '../../components/page-header'
import { useAdminQuery } from '../../data/api-context'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useAppointmentSheets } from '../appointments/use-appointment-sheets'
import { CustomerDetailSheet } from './customer-detail-sheet'

/** Customer search. Barbers only ever receive customers they serve (enforced by the backend). */
export function CustomersPage() {
  const desktop = useIsDesktop()
  const sheets = useAppointmentSheets()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim())
  const [open, setOpen] = useState<string | null>(null)
  const results = useAdminQuery(`customers|${deferred}`, (api) => api.customers.search(deferred))
  const list = results.data ?? []

  return (
    <div>
      <PageHeader
        title="לקוחות"
        actions={
          <Button size="sm" className="h-10" onClick={sheets.newCustomer}>
            <UserPlus />
            לקוח חדש
          </Button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" className="ps-10" placeholder="חיפוש לפי שם או טלפון" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש לקוחות" />
      </div>

      {!results.data ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title={deferred ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'} />
      ) : desktop ? (
        <div className="overflow-hidden rounded-[22px] bg-card shadow-elevation">
          <table className="w-full text-start text-subhead">
            <thead className="border-b text-footnote text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start font-medium">שם</th>
                <th className="px-5 py-3 text-start font-medium">טלפון</th>
                <th className="px-5 py-3 text-start font-medium">חשבון באפליקציה</th>
                <th className="px-5 py-3 text-start font-medium">לקוח מאז</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((c) => (
                <tr key={c.id} onClick={() => setOpen(c.id)} className="cursor-pointer hover:bg-muted/60">
                  <td className="px-5 py-3 font-medium">
                    <button type="button" className="text-start" onClick={() => setOpen(c.id)}>
                      {c.fullName}
                    </button>
                  </td>
                  <td className="px-5 py-3 tabular" dir="ltr">
                    <span className="block text-end">{c.phone ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.hasAccount ? 'כן' : 'לא'}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular">{new Date(c.createdAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-[22px] bg-card shadow-elevation">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(c.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start active:bg-[var(--row-pressed)]">
                <span className="truncate text-body font-medium">{c.fullName}</span>
                <span className="text-footnote text-muted-foreground tabular" dir="ltr">
                  {c.phone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <CustomerDetailSheet customerId={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
