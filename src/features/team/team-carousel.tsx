import { useCatalogue } from '@/catalogue/catalogue-context'
import { CenterCarousel } from '@/components/carousel/center-carousel'
import { useApp } from '@/store/app-context'

import { BarberSlide } from './barber-slide'

/** The real, active barbers from the catalogue. Choosing one starts a booking with them. */
export function TeamCarousel() {
  const { barbers, services } = useCatalogue()
  const { openBooking } = useApp()
  // Availability hints use the first bookable service (the shop's signature).
  const reference = services[0]

  if (!barbers.length) return <p className="text-subhead text-muted-foreground">פרטי הצוות יעודכנו בקרוב.</p>
  return (
    <CenterCarousel
      items={barbers}
      getKey={(b) => b.id}
      label="הצוות"
      slideLabel={(b) => b.name}
      aspect={1.42}
      cardWidth={(w) => (w < 640 ? Math.round(w * 0.64) : w < 1024 ? Math.round(w * 0.38) : Math.min(340, Math.round(w * 0.26)))}
      renderSlide={(barber) => (
        <BarberSlide
          barber={barber}
          serviceId={barber.serviceIds.includes(reference?.id ?? '') ? reference?.id : barber.serviceIds[0]}
          duration={reference?.duration ?? 45}
          onBook={() => openBooking({ mode: 'new', barberId: barber.id })}
        />
      )}
    />
  )
}
