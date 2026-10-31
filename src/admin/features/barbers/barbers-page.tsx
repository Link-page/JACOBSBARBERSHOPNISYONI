import { Plus, UserRound } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { PageHeader } from '../../components/page-header'
import { useCatalogue } from '../../components/use-catalogue'
import type { Barber } from '../../data/types'
import { BarberEditorSheet } from './barber-editor-sheet'
import { weekdayNames } from './weekdays'

const summary = (b: Barber) =>
  b.hours.length === 0 ? 'אין שעות עבודה' : b.hours.map((h) => weekdayNames[h.weekday].slice(0, 1) + '׳').join(' ') + ` · ${b.services.length} טיפולים`

export function BarbersPage() {
  const { barbers, loading } = useCatalogue()
  const [editing, setEditing] = useState<Barber | 'new' | null>(null)

  return (
    <div>
      <PageHeader
        title="צוות"
        subtitle="המערכת בנויה לכמה ספרים. כרגע פעיל: יעקב."
        actions={
          <Button size="sm" className="h-10" onClick={() => setEditing('new')}>
            <Plus />
            ספר חדש
          </Button>
        }
      />
      {loading && !barbers.length ? (
        <ListSkeleton rows={2} />
      ) : barbers.length === 0 ? (
        <EmptyState icon={UserRound} title="אין ספרים עדיין" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => setEditing(b)} className="pressable flex w-full items-center gap-4 rounded-[22px] bg-card p-4 text-start shadow-elevation">
                <Avatar className="size-14">
                  {b.photoUrl && <AvatarImage src={b.photoUrl} alt="" />}
                  <AvatarFallback className="text-title2">{b.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-headline font-semibold">{b.name}</span>
                    <span className={b.active ? 'rounded-full bg-success/12 px-2 text-caption2 font-semibold text-success' : 'rounded-full bg-muted px-2 text-caption2 font-semibold text-muted-foreground'}>
                      {b.active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </span>
                  <span className="block truncate text-footnote text-muted-foreground">{summary(b)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && <BarberEditorSheet barber={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
