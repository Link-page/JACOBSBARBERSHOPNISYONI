import { CalendarDays, CalendarPlus, Plus, RotateCcw } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'

import { ConfirmSheet } from '@/components/confirm-sheet'
import { DateTile } from '@/components/date-tile'
import { ListGroup, ListRow } from '@/components/list'
import { ScrollScreen } from '@/components/scroll-screen'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { useAddToCalendar } from '@/hooks/use-add-to-calendar'
import { inlineSign } from '@/lib/direction'
import { endTime, formatPrice, formatTime, relativeDay, shortDate } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

type Segment = 'upcoming' | 'history'

export function BookingsScreen() {
  const { upcoming, past, cancel, openBooking } = useApp()
  const { barberById, serviceById } = useCatalogue()
  const [segment, setSegment] = useState<Segment>('upcoming')
  const [cancelling, setCancelling] = useState<Appointment | null>(null)
  /** The server's reason when a cancellation was refused (e.g. too close to the time). */
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <ScrollScreen title="התורים שלי">
      <SegmentedControl
        id="bookings"
        className="mt-5 md:max-w-sm"
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'upcoming', label: 'קרובים' },
          { value: 'history', label: 'היסטוריה' },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={segment}
          initial={{ opacity: 0, x: (segment === 'history' ? 24 : -24) * inlineSign() }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={spring}
          className="mt-5"
        >
          {notice && (
            <p role="alert" className="mb-3 rounded-[16px] bg-destructive/10 px-4 py-3 text-footnote text-destructive">
              {notice}
            </p>
          )}
          {segment === 'upcoming' ? (
            upcoming.length ? (
              <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {upcoming.map((a) => (
                    <UpcomingCard key={a.id} appointment={a} onCancel={() => setCancelling(a)} />
                  ))}
                </AnimatePresence>
                <m.button
                  layout
                  type="button"
                  onClick={() => openBooking()}
                  transition={spring}
                  className="pressable flex h-[60px] items-center justify-center gap-2 rounded-[24px] border-[1.5px] border-dashed border-brass/45 text-subhead font-semibold text-muted-foreground"
                >
                  <Plus className="size-[18px] text-brass" strokeWidth={2.2} />
                  תור חדש
                </m.button>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <div className="md:max-w-3xl">
              <History appointments={past} />
            </div>
          )}
        </m.div>
      </AnimatePresence>

      <ConfirmSheet
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="לבטל את התור?"
        message={
          cancelling
            ? `${serviceById(cancelling.serviceId).name} אצל ${barberById(cancelling.barberId).name}, ${shortDate(new Date(cancelling.start))} ב-${formatTime(new Date(cancelling.start))}.`
            : ''
        }
        confirmLabel="ביטול התור"
        cancelLabel="השארת התור"
        onConfirm={() => cancelling && void cancel(cancelling.id).then(setNotice)}
      />
    </ScrollScreen>
  )
}

function UpcomingCard({ appointment, onCancel }: { appointment: Appointment; onCancel: () => void }) {
  const { now, openBooking } = useApp()
  const { barberById, serviceById } = useCatalogue()
  const addToCalendar = useAddToCalendar()
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  const time = formatTime(start)

  return (
    <m.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={spring}
      className="rounded-[24px] bg-card p-4 shadow-elevation"
    >
      <div className="flex items-center gap-4">
        <DateTile date={start} />
        <div className="min-w-0 flex-1 border-s border-border ps-4">
          <p className="truncate text-headline font-semibold">{service.name}</p>
          <p className="truncate text-subhead text-muted-foreground tabular">
            {time}–{endTime(time, service.duration)} · אצל {barber.name}
          </p>
          <p className="text-caption font-medium text-brass">{relativeDay(start, now)}</p>
        </div>
        <p className="self-start text-headline font-semibold tabular">{formatPrice(service.price)}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-10 flex-1"
          onClick={() => openBooking({ mode: 'reschedule', appointmentId: appointment.id })}
        >
          שינוי מועד
        </Button>
        <Button size="sm" variant="destructive" className="h-10 flex-1" onClick={onCancel}>
          ביטול
        </Button>
        <Button size="icon" variant="secondary" className="size-10" onClick={() => addToCalendar(appointment)} aria-label="הוספה ליומן">
          <CalendarPlus />
        </Button>
      </div>
    </m.article>
  )
}

function History({ appointments }: { appointments: Appointment[] }) {
  const { openBooking } = useApp()
  const { barberById, serviceById } = useCatalogue()
  if (!appointments.length) {
    return <p className="mt-16 text-center text-subhead text-muted-foreground">ביקורים קודמים יופיעו כאן.</p>
  }
  return (
    <ListGroup>
      {appointments.map((a) => {
        const service = serviceById(a.serviceId)
        const barber = barberById(a.barberId)
        const cancelled = a.status === 'cancelled'
        const missed = a.status === 'no_show'
        return (
          <ListRow
            key={a.id}
            leading={<DateTile date={new Date(a.start)} muted={cancelled} />}
            title={<span className={cancelled ? 'text-muted-foreground line-through' : undefined}>{service.name}</span>}
            subtitle={cancelled ? 'בוטל' : missed ? `אצל ${barber.name} · לא הגעתם` : `אצל ${barber.name} · ${formatPrice(service.price)}`}
            trailing={
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-footnote"
                onClick={() => openBooking({ mode: 'new', serviceId: a.serviceId, barberId: a.barberId })}
              >
                <RotateCcw className="size-3.5" strokeWidth={2.4} />
                שוב
              </Button>
            }
          />
        )
      })}
    </ListGroup>
  )
}

function EmptyState() {
  const { openBooking } = useApp()
  return (
    <div className="flex flex-col items-center px-6 pt-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-brass-soft">
        <CalendarDays className="size-7 text-brass" strokeWidth={1.7} />
      </span>
      <p className="mt-4 font-display text-title2 font-medium">אין תורים קרובים</p>
      <p className="mt-1 text-subhead text-muted-foreground">קביעת תור לוקחת פחות מדקה.</p>
      <Button className="mt-6 px-8" onClick={() => openBooking()}>
        קביעת תור
      </Button>
    </div>
  )
}
