import { CalendarPlus, ChevronRight, Scissors } from 'lucide-react'

import { useCustomer } from '@/account/account-context'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { serviceIcon } from '@/catalogue/service-icon'
import { ListGroup, ListRow } from '@/components/list'
import { NextAppointmentCard } from '@/components/next-appointment-card'
import { NextFreeLabel } from '@/components/next-free-label'
import { ScrollScreen } from '@/components/scroll-screen'
import { Section } from '@/components/section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { VisitCard } from '@/components/visit-card'
import { shop } from '@/data/shop'
import { GalleryCarousel } from '@/features/gallery/gallery-carousel'
import { TeamCarousel } from '@/features/team/team-carousel'
import { formatDuration, formatPrice, fullDate, greeting } from '@/lib/format'
import { BellButton } from '@/notifications/components/bell-button'
import { useApp } from '@/store/app-context'

export function HomeScreen() {
  const { now, upcoming, setTab, openBooking } = useApp()
  const { services } = useCatalogue()
  const profile = useCustomer()
  const next = upcoming[0]
  // "Next available" hints use the first service, the shop's signature.
  const reference = services[0]
  const firstName = profile.fullName.split(' ')[0]

  return (
    <ScrollScreen
      title={<span className="wordmark text-subhead">{shop.name}</span>}
      eyebrow={fullDate(now)}
      largeTitle={`${greeting(now)}, ${firstName}`}
      accessory={
        <div className="flex items-center gap-2 lg:hidden">
          <BellButton />
          <button type="button" onClick={() => setTab('profile')} className="pressable rounded-full" aria-label="פרופיל">
            <Avatar aria-hidden className="size-11">
              <AvatarFallback className="text-title3">{profile.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      }
    >
      {/* Desktop: the appointment and the shop's details side by side. */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <div>
          {next ? <NextAppointmentCard appointment={next} /> : <NoAppointmentCard onClick={() => openBooking()} />}
          <div className="mt-4">
            <Button size="lg" className="w-full" onClick={() => openBooking()}>
              <CalendarPlus className="size-[21px]" strokeWidth={1.9} />
              קביעת תור
            </Button>
            {reference && (
              <p className="mt-2.5 flex justify-center gap-1 text-footnote text-muted-foreground">
                הפנוי הקרוב ·
                <NextFreeLabel serviceId={reference.id} barberId="any" duration={reference.duration} className="inline tabular" />
              </p>
            )}
          </div>
        </div>
        <div className="hidden lg:block">
          <VisitCard />
        </div>
      </div>

      <Section title="גלריה" onTitleClick={() => setTab('lookbook')}>
        <div className="-mx-5 lg:mx-0">
          <GalleryCarousel source="home" />
        </div>
      </Section>

      <Section title="הצוות">
        <div className="-mx-5 lg:mx-0">
          <TeamCarousel />
        </div>
      </Section>

      <Section title="טיפולים ומחירים">
        <ListGroup className="md:hidden">
          {services.map((service) => (
            <ListRow
              key={service.id}
              icon={serviceIcon(service)}
              title={service.name}
              subtitle={formatDuration(service.duration)}
              value={formatPrice(service.price)}
              chevron
              onClick={() => openBooking({ mode: 'new', serviceId: service.id })}
            />
          ))}
        </ListGroup>
        <ServiceGrid />
      </Section>

      <Section title="ביקור במספרה" className="lg:hidden">
        <VisitCard />
      </Section>
    </ScrollScreen>
  )
}

/** Tablet and desktop: services as cards across the available width. */
function ServiceGrid() {
  const { services } = useCatalogue()
  const { openBooking } = useApp()
  return (
    <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => {
        const Icon = serviceIcon(service)
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => openBooking({ mode: 'new', serviceId: service.id })}
            className="pressable flex items-start gap-4 rounded-[24px] bg-card p-5 text-start shadow-elevation transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brass),var(--elevation)]"
          >
            <span className="surface-ink grid size-11 shrink-0 place-items-center rounded-full">
              <Icon className="size-5 text-brass" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-headline font-semibold">{service.name}</span>
              {service.description && <span className="mt-0.5 line-clamp-2 block text-footnote text-muted-foreground">{service.description}</span>}
              <span className="mt-2 block text-footnote text-muted-foreground tabular">{formatDuration(service.duration)}</span>
            </span>
            <span className="font-display text-title3 font-medium tabular">{formatPrice(service.price)}</span>
          </button>
        )
      })}
    </div>
  )
}

function NoAppointmentCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex w-full items-center gap-4 rounded-[28px] bg-card p-5 text-start shadow-elevation"
    >
      <span className="surface-ink grid size-12 shrink-0 place-items-center rounded-full">
        <Scissors className="size-5 text-brass" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-headline font-semibold">אין תורים קרובים</p>
        <p className="text-subhead text-muted-foreground">הכיסא מחכה לכם.</p>
      </div>
      <ChevronRight className="size-5 text-tertiary rtl:-scale-x-100" />
    </button>
  )
}
