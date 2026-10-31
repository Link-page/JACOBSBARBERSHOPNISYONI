import { CalendarClock, CalendarPlus, Navigation, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { BarberAvatar } from '@/components/barber-avatar'
import { barberById, serviceById } from '@/data/shop'
import { addToCalendar } from '@/lib/calendar'
import { dayMonth, formatDuration, formatPrice, formatTime, relativeDay, weekdayLong } from '@/lib/format'
import { links } from '@/lib/links'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

export const passSurface =
  'grain relative overflow-hidden text-white shadow-[0_24px_48px_-24px_rgb(0_0_0/0.6)] bg-[radial-gradient(140%_100%_at_100%_0%,rgb(255_255_255/0.16),transparent_52%),linear-gradient(160deg,var(--pass-from),var(--pass-to))]'

/** The next appointment as a Wallet pass — date and time read first, actions sit on glass. */
export function AppointmentPass({ appointment }: { appointment: Appointment }) {
  const { now, openBooking } = useApp()
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  const end = new Date(start.getTime() + service.duration * 60_000)

  return (
    <article className={cn(passSurface, 'rounded-[30px]')}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),inset_0_0_0_0.5px_rgb(255_255_255/0.08)]"
      />
      <div className="relative px-5 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold tracking-[0.14em] text-white/55 uppercase">Next appointment</span>
          <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold">
            <span className="size-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
            {relativeDay(start, now)}
          </span>
        </div>
        <div className="mt-8 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-subhead text-white/60">{weekdayLong(start)}</p>
            <p className="truncate text-title1 font-bold">{dayMonth(start)}</p>
          </div>
          <div className="text-right">
            <p className="text-[42px] leading-none font-semibold tracking-[-0.035em] tabular">{formatTime(start)}</p>
            <p className="mt-1.5 text-footnote text-white/55 tabular">until {formatTime(end)}</p>
          </div>
        </div>
      </div>

      {/* Perforation, like a ticket. */}
      <div aria-hidden className="relative z-[2] my-4 h-5">
        <span className="absolute top-0 -left-2.5 size-5 rounded-full bg-background" />
        <span className="absolute top-0 -right-2.5 size-5 rounded-full bg-background" />
        <span className="absolute inset-x-5 top-1/2 border-t border-dashed border-white/20" />
      </div>

      <div className="relative px-5 pb-5">
        <div className="flex items-center gap-3">
          <BarberAvatar barber={barber} className="size-11 text-headline ring-1 ring-white/15" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-headline font-semibold">{service.name}</p>
            <p className="truncate text-footnote text-white/60">
              with {barber.name} · {formatDuration(service.duration)}
            </p>
          </div>
          <p className="text-headline font-semibold tabular">{formatPrice(service.price)}</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <PassAction icon={Navigation} label="Directions" href={links.directions} />
          <PassAction icon={CalendarPlus} label="Calendar" onClick={() => addToCalendar(appointment)} />
          <PassAction
            icon={CalendarClock}
            label="Reschedule"
            onClick={() => openBooking({ mode: 'reschedule', appointmentId: appointment.id })}
          />
        </div>
      </div>
    </article>
  )
}

type PassActionProps = { icon: LucideIcon; label: string } & (
  | ({ href: string } & Omit<ComponentProps<'a'>, 'href'>)
  | ({ href?: undefined } & ComponentProps<'button'>)
)

function PassAction({ icon: Icon, label, ...props }: PassActionProps) {
  const className =
    'glass-dark pressable flex h-[60px] flex-col items-center justify-center gap-1 rounded-[18px] text-caption font-medium text-white/90'
  const content = (
    <>
      <Icon className="size-5" strokeWidth={2} />
      {label}
    </>
  )
  if (props.href !== undefined) {
    return (
      <a {...(props as ComponentProps<'a'>)} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" {...(props as ComponentProps<'button'>)} className={className}>
      {content}
    </button>
  )
}
