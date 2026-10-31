import { MapPin } from 'lucide-react'

import type { Appointment } from '@/api'
import { BarberPortrait } from '@/components/barber-portrait'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { formatTime, shortDate } from '@/lib/format'
import { links } from '@/lib/links'

import { BookingDetails } from '../components/booking-details'

type ReviewStepProps = {
  serviceId: string
  /** The barber who will take the slot. */
  barberId: string
  anyBarber: boolean
  date: string
  time: string
  previous?: Appointment
}

export function ReviewStep({ serviceId, barberId, anyBarber, date, time, previous }: ReviewStepProps) {
  const { barberById, serviceById } = useCatalogue()
  const barber = barberById(barberId)
  const before = previous && new Date(previous.start)

  return (
    <div className="px-5 pt-4 pb-8">
      <div className="flex items-center gap-3.5">
        <BarberPortrait barber={barber} className="size-14 text-[22px]" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-title2 font-medium">{serviceById(serviceId).name}</h2>
          <p className="text-subhead text-muted-foreground">
            אצל {barber.name}
            {anyBarber && ' · הספר הפנוי הראשון'}
          </p>
        </div>
      </div>

      <BookingDetails serviceId={serviceId} barberId={barberId} date={date} time={time} className="mt-5" />

      {before && (
        <p className="mt-3 rounded-[16px] bg-muted px-4 py-2.5 text-footnote text-muted-foreground">
          במקום <span className="line-through">{shortDate(before)} ב-{formatTime(before)}</span>
        </p>
      )}

      <a
        href={links.directions}
        target="_blank"
        rel="noreferrer"
        className="pressable mt-3 flex items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 shadow-elevation"
      >
        <MapPin className="size-5 text-brass" strokeWidth={1.8} />
        <span className="text-subhead">
          <span className="font-medium">{links.fullAddress}</span>
        </span>
      </a>

      <p className="mt-4 px-1 text-footnote text-muted-foreground">
        התשלום במספרה. אפשר לשנות או לבטל את התור בכל זמן מתוך ״התורים שלי״.
      </p>
    </div>
  )
}
