import { Ban, CalendarCheck } from 'lucide-react'

import { fromDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

import { EmptyState } from '../../components/empty-state'
import { StatusBadge } from '../../components/status-badge'
import { useCatalogue } from '../../components/use-catalogue'
import type { Appointment, TimeBlock } from '../../data/types'
import { dateOf, timeOf } from '../appointments/time'

type Item = { kind: 'appointment'; at: string; appointment: Appointment } | { kind: 'block'; at: string; block: TimeBlock }

/** Phone timeline: appointments and blocked time in order, one or more days. */
export function PhoneAgenda({
  days,
  appointments,
  blocks,
  onAppointment,
  onBlock,
}: {
  days: string[]
  appointments: Appointment[]
  blocks: TimeBlock[]
  onAppointment: (appointment: Appointment) => void
  onBlock: (block: TimeBlock) => void
}) {
  const { serviceName, barberName, barbers } = useCatalogue()
  const showBarber = barbers.filter((b) => b.active).length > 1

  return (
    <div className="flex flex-col gap-5">
      {days.map((date) => {
        const items: Item[] = [
          ...appointments.filter((a) => dateOf(a.startsAt) === date).map((a) => ({ kind: 'appointment' as const, at: a.startsAt, appointment: a })),
          ...blocks.filter((b) => dateOf(b.startsAt) <= date && dateOf(new Date(new Date(b.endsAt).getTime() - 1).toISOString()) >= date).map((b) => ({ kind: 'block' as const, at: b.startsAt, block: b })),
        ].sort((x, y) => x.at.localeCompare(y.at))

        return (
          <section key={date} aria-label={date}>
            {days.length > 1 && (
              <h3 className="mb-2 px-1 font-display text-headline font-medium">
                {fromDayKey(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
            )}
            {items.length === 0 ? (
              days.length === 1 ? <EmptyState icon={CalendarCheck} title="אין תורים ביום הזה" /> : <p className="px-1 text-footnote text-muted-foreground">אין תורים</p>
            ) : (
              <ol className="relative flex flex-col gap-2 border-s-2 border-border ps-4">
                {items.map((item) =>
                  item.kind === 'block' ? (
                    <li key={item.block.id}>
                      <button
                        type="button"
                        onClick={() => onBlock(item.block)}
                        className="pressable flex w-full items-center gap-3 rounded-[16px] bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,transparent_6px_12px)] px-4 py-3 text-start text-footnote text-muted-foreground"
                      >
                        <Ban className="size-4" />
                        {dateOf(item.block.startsAt) === date ? timeOf(item.block.startsAt) : '00:00'}–{dateOf(item.block.endsAt) === date ? timeOf(item.block.endsAt) : '24:00'} · {item.block.reason || 'זמן חסום'}
                      </button>
                    </li>
                  ) : (
                    <li key={item.appointment.id}>
                      <button
                        type="button"
                        onClick={() => onAppointment(item.appointment)}
                        className={cn('pressable flex w-full items-center gap-3 rounded-[16px] bg-card px-4 py-3 text-start shadow-elevation', item.appointment.status === 'cancelled' && 'opacity-55')}
                      >
                        <span className="w-12 font-display text-title3 leading-none font-medium tabular">{timeOf(item.appointment.startsAt)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-medium">{item.appointment.customerName}</span>
                          <span className="block truncate text-footnote text-muted-foreground">
                            {serviceName(item.appointment.serviceId)} · עד {timeOf(item.appointment.endsAt)}
                            {showBarber && ` · ${barberName(item.appointment.barberId)}`}
                          </span>
                        </span>
                        <StatusBadge status={item.appointment.status} />
                      </button>
                    </li>
                  ),
                )}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
