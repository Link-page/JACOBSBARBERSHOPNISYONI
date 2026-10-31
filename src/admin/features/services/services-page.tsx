import { ArrowDown, ArrowUp, Plus, Scissors } from 'lucide-react'
import { m } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { formatDuration, formatPrice } from '@/lib/format'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { PageHeader } from '../../components/page-header'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import type { Service } from '../../data/types'
import { ServiceEditorSheet } from './service-editor-sheet'

/** Services in the order customers see them. Reorder with the arrows, then save. */
export function ServicesPage() {
  const api = useAdminApi()
  const { services, barbers, loading } = useCatalogue()
  const { run, pending } = useAction()
  // Local reordering (ids) until saved; otherwise the server order.
  const [draftIds, setDraftIds] = useState<string[] | null>(null)
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const order = draftIds ? draftIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s) : services
  const changed = order.some((s, i) => s.id !== services[i]?.id)

  const move = (index: number, delta: number) => {
    const next = order.map((s) => s.id)
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    setDraftIds(next)
  }

  return (
    <div>
      <PageHeader
        title="טיפולים ומחירים"
        subtitle="שינויים כאן מופיעים באפליקציית הלקוחות."
        actions={
          <>
            {changed && (
              <Button size="sm" className="h-10" disabled={pending} onClick={() => run(() => api.services.reorder(order.map((s) => s.id)), 'הסדר נשמר').then(() => setDraftIds(null))}>
                שמירת הסדר
              </Button>
            )}
            <Button size="sm" variant={changed ? 'secondary' : 'default'} className="h-10" onClick={() => setEditing('new')}>
              <Plus />
              טיפול חדש
            </Button>
          </>
        }
      />
      {loading && !order.length ? (
        <ListSkeleton />
      ) : order.length === 0 ? (
        <EmptyState icon={Scissors} title="אין טיפולים עדיין" />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {order.map((service, index) => {
            const by = barbers.filter((b) => b.services.some((s) => s.serviceId === service.id)).map((b) => b.name)
            return (
              <m.li key={service.id} layout transition={spring} className={cn('flex items-center gap-3 rounded-[20px] bg-card p-3 shadow-elevation lg:p-4', !service.active && 'opacity-60')}>
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" aria-label={`הזזת ${service.name} למעלה`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`הזזת ${service.name} למטה`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown />
                  </Button>
                </div>
                <button type="button" onClick={() => setEditing(service)} className="flex min-w-0 flex-1 items-center gap-4 text-start">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold">{service.name}</span>
                    <span className="block truncate text-footnote text-muted-foreground">
                      {formatDuration(service.durationMinutes)} · {by.length ? by.join(', ') : 'לא משויך לספר'}
                      {!service.active && ' · כבוי'}
                    </span>
                  </span>
                  <span className="font-display text-title3 font-medium tabular">{formatPrice(service.price)}</span>
                </button>
              </m.li>
            )
          })}
        </ol>
      )}
      {editing && <ServiceEditorSheet service={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
