import { Check, MapPin, Users } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useMemo, useRef, type ComponentProps } from 'react'

import { BarberAvatar } from '@/components/barber-avatar'
import { ListGroup, ListRow } from '@/components/list'
import { barberById, barbers, serviceById, services, shop, type Service } from '@/data/shop'
import {
  dayMonth,
  formatDuration,
  formatPrice,
  formatTime,
  monthYear,
  shortDate,
  slotLabel,
  weekdayLong,
  weekdayShort,
} from '@/lib/format'
import { links } from '@/lib/links'
import { spring, springBouncy, springSnappy } from '@/lib/motion'
import { addDays, dayKey, fromDayKey, hoursFor, isSameDay, nextAvailable, slotsFor, startOfDay, toMinutes } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

/* ------------------------------------------------------------------------ */

function SelectMark({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-[24px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-tertiary',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springBouncy}>
            <Check className="size-3.5" strokeWidth={3.25} />
          </m.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/* ------------------------------------------------------------------------ */

export function ServiceStep({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  return (
    <ListGroup>
      {services.map((service) => (
        <ListRow
          key={service.id}
          icon={service.icon}
          title={service.name}
          subtitle={`${formatDuration(service.duration)} · ${service.description}`}
          value={formatPrice(service.price)}
          trailing={<SelectMark selected={value === service.id} />}
          onClick={() => onChange(service.id)}
        />
      ))}
    </ListGroup>
  )
}

/* ------------------------------------------------------------------------ */

function OptionCard({ selected, className, children, ...props }: ComponentProps<'button'> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'pressable relative flex rounded-[26px] bg-card p-4 transition-shadow duration-200',
        selected && 'shadow-[inset_0_0_0_2px_var(--primary)]',
        className,
      )}
      {...props}
    >
      {children}
      <AnimatePresence>
        {selected && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={springBouncy}
            className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="size-3.5" strokeWidth={3.25} />
          </m.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export function BarberStep({
  value,
  duration,
  onChange,
}: {
  value?: string
  duration: number
  onChange: (id: string) => void
}) {
  const { now } = useApp()
  const anySlot = useMemo(() => nextAvailable(now, 'any', duration), [now, duration])

  return (
    <div className="grid grid-cols-2 gap-3">
      <OptionCard selected={value === 'any'} onClick={() => onChange('any')} className="col-span-2 items-center gap-3.5 text-left">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-muted">
          <Users className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-headline font-semibold">Any barber</span>
          <span className="block text-footnote text-muted-foreground">
            {anySlot ? `Earliest · ${slotLabel(anySlot.date, anySlot.time, now)}` : 'Fully booked'}
          </span>
        </span>
      </OptionCard>
      {barbers.map((barber) => {
        const slot = nextAvailable(now, barber.id, duration)
        return (
          <OptionCard
            key={barber.id}
            selected={value === barber.id}
            onClick={() => onChange(barber.id)}
            className="flex-col items-center pt-5 text-center"
          >
            <BarberAvatar barber={barber} className="size-16 text-[24px]" />
            <span className="mt-3 text-headline font-semibold">{barber.name}</span>
            <span className="line-clamp-1 text-footnote text-muted-foreground">{barber.specialties.join(' · ')}</span>
            <span className="mt-3 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular">
              {slot ? slotLabel(slot.date, slot.time, now) : 'Fully booked'}
            </span>
          </OptionCard>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------------ */

const dayParts = [
  { label: 'Morning', from: 0, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 24 * 60 },
]

export function TimeStep({
  barberId,
  duration,
  day,
  time,
  onDayChange,
  onTimeChange,
}: {
  barberId: string
  duration: number
  day?: string
  time?: string
  onDayChange: (day: string) => void
  onTimeChange: (time: string) => void
}) {
  const { now } = useApp()
  const selectedRef = useRef<HTMLButtonElement>(null)

  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const date = addDays(startOfDay(now), i)
        return {
          date,
          key: dayKey(date),
          closed: !hoursFor(date),
          available: slotsFor(date, barberId, duration, now).some((s) => s.available),
        }
      }),
    [now, barberId, duration],
  )

  const firstOpen = days.find((d) => d.available)?.key
  useEffect(() => {
    if (!day && firstOpen) onDayChange(firstOpen)
  }, [day, firstOpen, onDayChange])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [day])

  const slots = useMemo(
    () => (day ? slotsFor(fromDayKey(day), barberId, duration, now) : []),
    [day, barberId, duration, now],
  )
  const hasAvailability = slots.some((s) => s.available)

  return (
    <div>
      <p className="px-1 text-title3 font-bold">{monthYear(day ? fromDayKey(day) : now)}</p>

      <div className="scrollbar-none -mx-5 mt-3 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1">
        {days.map(({ date, key, closed, available }) => {
          const active = key === day
          return (
            <button
              key={key}
              ref={active ? selectedRef : undefined}
              type="button"
              disabled={!available}
              onClick={() => onDayChange(key)}
              aria-pressed={active}
              aria-label={`${weekdayLong(date)} ${dayMonth(date)}${closed ? ', closed' : !available ? ', fully booked' : ''}`}
              className={cn(
                'pressable relative flex h-[78px] w-[56px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[20px]',
                !active && 'bg-card',
                !available && 'opacity-40',
              )}
            >
              {active && (
                <m.span layoutId="day-pill" transition={springSnappy} className="absolute inset-0 rounded-[20px] bg-primary" />
              )}
              <span
                className={cn(
                  'relative text-caption2 font-semibold tracking-[0.06em] uppercase transition-colors',
                  active ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {weekdayShort(date)}
              </span>
              <span
                className={cn(
                  'relative text-title3 font-semibold tabular transition-colors',
                  active && 'text-primary-foreground',
                  !available && 'line-through decoration-1',
                )}
              >
                {date.getDate()}
              </span>
              {isSameDay(date, now) && (
                <span className={cn('absolute bottom-2 size-1 rounded-full', active ? 'bg-primary-foreground' : 'bg-foreground')} />
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={`${day}-${barberId}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={spring}
        >
          {!hasAvailability ? (
            <p className="mt-12 text-center text-subhead text-muted-foreground">
              {day && !hoursFor(fromDayKey(day)) ? 'Closed this day.' : 'Fully booked — try another day.'}
            </p>
          ) : (
            dayParts.map((part) => {
              const list = slots.filter((s) => {
                const m = toMinutes(s.time)
                return m >= part.from && m < part.to
              })
              if (!list.length) return null
              return (
                <div key={part.label} className="mt-6">
                  <p className="mb-2.5 px-1 text-footnote font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    {part.label}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {list.map((slot) => {
                      const active = slot.time === time
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => onTimeChange(slot.time)}
                          aria-pressed={active}
                          className={cn(
                            'pressable relative h-11 rounded-[14px] text-callout font-semibold tabular',
                            slot.available ? !active && 'bg-card' : 'text-tertiary line-through decoration-1',
                          )}
                        >
                          {active && (
                            <m.span
                              layoutId="time-pill"
                              transition={springSnappy}
                              className="absolute inset-0 rounded-[14px] bg-primary"
                            />
                          )}
                          <span className={cn('relative transition-colors', active && 'text-primary-foreground')}>
                            {slot.time}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-medium tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-headline font-semibold tabular">{value}</dd>
    </div>
  )
}

export function ReviewStep({
  service,
  barberId,
  anyBarber,
  start,
  previous,
}: {
  service: Service
  barberId: string
  anyBarber: boolean
  start: Date
  previous?: Appointment
}) {
  const barber = barberById(barberId)
  const end = new Date(start.getTime() + service.duration * 60_000)
  const before = previous && new Date(previous.start)

  return (
    <div>
      <div className="rounded-[28px] bg-card p-5">
        <div className="flex items-center gap-3.5">
          <BarberAvatar barber={barber} className="size-14 text-title3" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-title3 font-bold">{service.name}</p>
            <p className="text-subhead text-muted-foreground">
              with {barber.name}
              {anyBarber && ' · first available'}
            </p>
          </div>
        </div>
        <div className="my-5 h-[0.5px] bg-border" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Detail label="Date" value={`${weekdayShort(start)}, ${dayMonth(start)}`} />
          <Detail label="Time" value={`${formatTime(start)} – ${formatTime(end)}`} />
          <Detail label="Duration" value={formatDuration(service.duration)} />
          <Detail label="Price" value={formatPrice(service.price)} />
        </dl>
        {before && (
          <p className="mt-5 rounded-2xl bg-muted px-3.5 py-2.5 text-footnote text-muted-foreground">
            Moving from{' '}
            <span className="line-through">
              {shortDate(before)} at {formatTime(before)}
            </span>
          </p>
        )}
      </div>

      <ListGroup className="mt-4">
        <ListRow icon={MapPin} title={shop.legalName} subtitle={links.fullAddress} />
      </ListGroup>

      <p className="mt-4 px-4 text-footnote text-muted-foreground">
        Pay at the shop after your visit. You can reschedule or cancel anytime from Bookings.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

export function DoneStep({ appointment, rescheduled }: { appointment: Appointment; rescheduled: boolean }) {
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)

  return (
    <div className="flex flex-col items-center pt-14 text-center">
      <div className="relative">
        <m.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary"
          initial={{ scale: 1, opacity: 0.22 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
        <m.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springBouncy}
          className="relative grid size-24 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-12" fill="none" aria-hidden>
            <m.path
              d="M5.5 12.5l4 4L18.5 7.5"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            />
          </svg>
        </m.div>
      </div>
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.25 }}>
        <h2 className="mt-8 text-title1 font-bold">{rescheduled ? 'All set' : "You're booked"}</h2>
        <p className="mt-2 text-body text-muted-foreground">
          {service.name} with {barber.name}
          <br />
          {weekdayLong(start)}, {dayMonth(start)} at {formatTime(start)}
        </p>
      </m.div>
    </div>
  )
}
