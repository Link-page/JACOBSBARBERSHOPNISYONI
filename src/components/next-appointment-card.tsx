import { CalendarClock, CalendarPlus, Navigation, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { barberById, serviceById } from '@/data/shop'
import { addToCalendar } from '@/lib/calendar'
import { endTime, formatTime, monthName, relativeDay, weekdayLong } from '@/lib/format'
import { links } from '@/lib/links'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

/** The customer's next visit: a large serif date, the time, and three quick actions. */
export function NextAppointmentCard({ appointment }: { appointment: Appointment }) {
  const { now, openBooking } = useApp()
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  const time = formatTime(start)

  return (
    <article className="surface-ink grain rounded-[28px]">
      <div className="relative px-5 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-footnote font-medium text-ink-foreground/60">התור הבא שלך</span>
          <span className="rounded-full border border-brass/45 px-2.5 py-0.5 text-caption font-medium text-brass">
            {relativeDay(start, now)}
          </span>
        </div>

        <div className="mt-5 flex items-stretch">
          <div className="flex w-[84px] shrink-0 flex-col items-center justify-center border-e border-white/10 pe-5">
            <span className="font-display text-[56px] leading-[0.9] font-medium tabular">{start.getDate()}</span>
            <span className="mt-1.5 text-footnote font-medium text-brass">{monthName(start)}</span>
          </div>
          <div className="min-w-0 flex-1 ps-5">
            <p className="text-subhead text-ink-foreground/60">{weekdayLong(start)}</p>
            <p className="font-display text-[34px] leading-tight font-medium tabular">
              {time}
              <span className="ms-2 font-sans text-footnote text-ink-foreground/50">עד {endTime(time, service.duration)}</span>
            </p>
            <p className="mt-0.5 truncate text-subhead">
              {service.name} <span className="text-ink-foreground/55">· אצל {barber.name}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
        <CardAction icon={Navigation} label="ניווט" href={links.directions} />
        <CardAction icon={CalendarPlus} label="ליומן" onClick={() => addToCalendar(appointment)} />
        <CardAction
          icon={CalendarClock}
          label="שינוי מועד"
          onClick={() => openBooking({ mode: 'reschedule', appointmentId: appointment.id })}
        />
      </div>
    </article>
  )
}

type CardActionProps = { icon: LucideIcon; label: string } & (
  | ({ href: string } & Omit<ComponentProps<'a'>, 'href'>)
  | ({ href?: undefined } & ComponentProps<'button'>)
)

function CardAction({ icon: Icon, label, ...props }: CardActionProps) {
  const className =
    'pressable flex h-[52px] items-center justify-center gap-2 text-footnote font-medium text-ink-foreground/90 active:bg-white/5'
  const content = (
    <>
      <Icon className="size-[17px] text-brass" strokeWidth={1.8} />
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
