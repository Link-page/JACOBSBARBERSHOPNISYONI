import { CalendarDays, CalendarPlus, Plus, RotateCcw } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'

import { ConfirmSheet } from '@/components/confirm-sheet'
import { DateTile } from '@/components/date-tile'
import { ListGroup, ListRow } from '@/components/list'
import { ScrollScreen } from '@/components/scroll-screen'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { barberById, serviceById } from '@/data/shop'
import { addToCalendar } from '@/lib/calendar'
import { formatPrice, formatTime, relativeDay, shortDate } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

type Segment = 'upcoming' | 'history'

export function BookingsScreen() {
  const { upcoming, past, cancel, openBooking } = useApp()
  const [segment, setSegment] = useState<Segment>('upcoming')
  const [cancelling, setCancelling] = useState<Appointment | null>(null)

  return (
    <ScrollScreen title="Bookings">
      <SegmentedControl
        id="bookings"
        className="mt-5"
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'history', label: 'History' },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={segment}
          initial={{ opacity: 0, x: segment === 'history' ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={spring}
          className="mt-5"
        >
          {segment === 'upcoming' ? (
            upcoming.length ? (
              <div className="flex flex-col gap-3">
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
                  className="pressable flex h-[60px] items-center justify-center gap-2 rounded-[26px] border-[1.5px] border-dashed border-tertiary text-subhead font-semibold text-muted-foreground"
                >
                  <Plus className="size-[18px]" strokeWidth={2.5} />
                  New Appointment
                </m.button>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <History appointments={past} />
          )}
        </m.div>
      </AnimatePresence>

      <ConfirmSheet
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel appointment?"
        message={
          cancelling
            ? `${serviceById(cancelling.serviceId).name} with ${barberById(cancelling.barberId).name} on ${shortDate(new Date(cancelling.start))} at ${formatTime(new Date(cancelling.start))}.`
            : ''
        }
        confirmLabel="Cancel Appointment"
        cancelLabel="Keep Appointment"
        onConfirm={() => cancelling && cancel(cancelling.id)}
      />
    </ScrollScreen>
  )
}

function UpcomingCard({ appointment, onCancel }: { appointment: Appointment; onCancel: () => void }) {
  const { now, openBooking } = useApp()
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)

  return (
    <m.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={spring}
      className="rounded-[26px] bg-card p-4"
    >
      <div className="flex items-center gap-3.5">
        <DateTile date={start} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-headline font-semibold">{service.name}</p>
          <p className="truncate text-subhead text-muted-foreground">
            {formatTime(start)} · with {barber.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-headline font-semibold tabular">{formatPrice(service.price)}</p>
          <p className="text-caption font-medium text-muted-foreground">{relativeDay(start, now)}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-10 flex-1"
          onClick={() => openBooking({ mode: 'reschedule', appointmentId: appointment.id })}
        >
          Reschedule
        </Button>
        <Button size="sm" variant="destructive" className="h-10 flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-10"
          onClick={() => addToCalendar(appointment)}
          aria-label="Add to Calendar"
        >
          <CalendarPlus />
        </Button>
      </div>
    </m.article>
  )
}

function History({ appointments }: { appointments: Appointment[] }) {
  const { openBooking } = useApp()
  if (!appointments.length) {
    return <p className="mt-16 text-center text-subhead text-muted-foreground">Your past visits will appear here.</p>
  }
  return (
    <ListGroup>
      {appointments.map((a) => {
        const service = serviceById(a.serviceId)
        const barber = barberById(a.barberId)
        const start = new Date(a.start)
        const cancelled = a.status === 'cancelled'
        return (
          <ListRow
            key={a.id}
            leading={<DateTile date={start} className="size-11 rounded-[12px]" muted={cancelled} />}
            title={<span className={cancelled ? 'text-muted-foreground line-through' : undefined}>{service.name}</span>}
            subtitle={cancelled ? 'Cancelled' : `with ${barber.name} · ${formatPrice(service.price)}`}
            trailing={
              <Button
                size="sm"
                variant="secondary"
                className="h-8 px-3 text-footnote"
                onClick={() => openBooking({ mode: 'new', serviceId: a.serviceId, barberId: a.barberId })}
              >
                <RotateCcw className="size-3.5" strokeWidth={2.5} />
                Rebook
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
      <span className="grid size-16 place-items-center rounded-full bg-card">
        <CalendarDays className="size-7 text-muted-foreground" />
      </span>
      <p className="mt-4 text-title3 font-bold">No upcoming appointments</p>
      <p className="mt-1 text-subhead text-muted-foreground">Book your next cut in under a minute.</p>
      <Button className="mt-6 px-8" onClick={() => openBooking()}>
        Book Now
      </Button>
    </div>
  )
}
