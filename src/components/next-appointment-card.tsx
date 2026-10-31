import { CalendarClock, CalendarPlus, MessageCircle, Navigation, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { useCatalogue } from '@/catalogue/catalogue-context'
import { BarberPortrait } from '@/components/barber-portrait'
import { attendanceView, canSelfManage } from '@/features/confirmation/attendance'
import { AttendancePanel } from '@/features/confirmation/attendance-panel'
import { useCancellationRequestLink } from '@/features/confirmation/use-cancellation-link'
import { useAddToCalendar } from '@/hooks/use-add-to-calendar'
import { endTime, formatTime, monthName, relativeDay, weekdayLong } from '@/lib/format'
import { links } from '@/lib/links'
import { useApp } from '@/store/app-context'
import type { Appointment } from '@/store/types'

/** The customer's next visit: a large serif date, the time, and three quick actions. */
export function NextAppointmentCard({ appointment }: { appointment: Appointment }) {
  const { now, openBooking } = useApp()
  const { barberById, serviceById } = useCatalogue()
  const addToCalendar = useAddToCalendar()
  const service = serviceById(appointment.serviceId)
  const barber = barberById(appointment.barberId)
  const start = new Date(appointment.start)
  const time = formatTime(start)
  const attendance = attendanceView(appointment, now)
  const whatsapp = useCancellationRequestLink(appointment)

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
              {/* Kept whole: on narrow phones it moves under the start time as one unit. */}
              <span className="ms-2 inline-block font-sans text-footnote whitespace-nowrap text-ink-foreground/50">עד {endTime(time, service.duration)}</span>
            </p>
            <p className="mt-0.5 truncate text-subhead">{service.name}</p>
          </div>
          {/* The booked barber — photo and name — in the space at the end of the date/time row. */}
          <div className="ms-3 flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 sm:w-20">
            <BarberPortrait barber={barber} className="size-12 bg-white/[0.06] text-title2 min-[390px]:size-14 sm:size-16" />
            <span className="max-w-full truncate text-caption text-ink-foreground/60">אצל {barber.name}</span>
          </div>
        </div>
      </div>

      {attendance.kind !== 'none' && (
        <div className="relative px-5 pt-4">
          <AttendancePanel appointment={appointment} view={attendance} tone="ink" />
        </div>
      )}

      <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
        <CardAction icon={Navigation} label="ניווט" href={links.directions} />
        <CardAction icon={CalendarPlus} label="ליומן" onClick={() => addToCalendar(appointment)} />
        {canSelfManage(attendance) || !whatsapp ? (
          <CardAction
            icon={CalendarClock}
            label="שינוי מועד"
            disabled={!canSelfManage(attendance)}
            onClick={() => openBooking({ mode: 'reschedule', appointmentId: appointment.id })}
          />
        ) : (
          <CardAction icon={MessageCircle} label="וואטסאפ" href={whatsapp} />
        )}
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
