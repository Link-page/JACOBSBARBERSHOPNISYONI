import { CalendarPlus, ChevronRight, Scissors } from 'lucide-react'
import { m } from 'motion/react'

import { BarberAvatar } from '@/components/barber-avatar'
import { ListGroup, ListRow } from '@/components/list'
import { LookCard } from '@/components/look-card'
import { NextAppointmentCard } from '@/components/next-appointment-card'
import { NextFreeLabel } from '@/components/next-free-label'
import { ScrollScreen } from '@/components/scroll-screen'
import { Section } from '@/components/section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { VisitCard } from '@/components/visit-card'
import { barbers, looks, services, shop, user } from '@/data/shop'
import { formatDuration, formatPrice, fullDate, greeting } from '@/lib/format'
import { useApp } from '@/store/app-context'

/** The most common booking length, used for "next available" hints. */
const TYPICAL_DURATION = 45

export function HomeScreen() {
  const { now, upcoming, setTab, openBooking } = useApp()
  const next = upcoming[0]

  return (
    <ScrollScreen
      title={<span className="wordmark text-subhead">{shop.name}</span>}
      eyebrow={fullDate(now)}
      largeTitle={`${greeting(now)}, ${user.firstName}`}
      accessory={
        <button type="button" onClick={() => setTab('profile')} className="pressable rounded-full" aria-label="פרופיל">
          <Avatar aria-hidden className="size-11">
            <AvatarFallback className="text-title3">{user.initial}</AvatarFallback>
          </Avatar>
        </button>
      }
    >
      <div className="mt-6">
        {next ? <NextAppointmentCard appointment={next} /> : <NoAppointmentCard onClick={() => openBooking()} />}
      </div>

      <div className="mt-4">
        <Button size="lg" className="w-full" onClick={() => openBooking()}>
          <CalendarPlus className="size-[21px]" strokeWidth={1.9} />
          קביעת תור
        </Button>
        <p className="mt-2.5 flex justify-center gap-1 text-footnote text-muted-foreground">
          הפנוי הקרוב ·
          <NextFreeLabel barberId="any" duration={TYPICAL_DURATION} className="inline tabular" />
        </p>
      </div>

      <Section title="גלריה" onTitleClick={() => setTab('lookbook')}>
        <m.div layoutScroll className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5">
          {looks.map((look) => (
            <div key={look.id} className="w-[158px] shrink-0 snap-start">
              <LookCard look={look} source="home" ratio={1.32} />
            </div>
          ))}
        </m.div>
      </Section>

      <Section title="טיפולים ומחירים">
        <ListGroup>
          {services.map((service) => (
            <ListRow
              key={service.id}
              icon={service.icon}
              title={service.name}
              subtitle={formatDuration(service.duration)}
              value={formatPrice(service.price)}
              chevron
              onClick={() => openBooking({ mode: 'new', serviceId: service.id })}
            />
          ))}
        </ListGroup>
      </Section>

      <Section title="הצוות">
        <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2">
          {barbers.map((barber) => (
            <button
              key={barber.id}
              type="button"
              onClick={() => openBooking({ mode: 'new', barberId: barber.id })}
              className="pressable flex w-[140px] shrink-0 snap-start flex-col items-center rounded-[24px] bg-card px-3 pt-5 pb-4 text-center shadow-elevation"
            >
              <BarberAvatar barber={barber} className="size-[68px] text-[28px]" />
              <span className="mt-3 text-headline font-semibold">{barber.name}</span>
              <span className="line-clamp-1 text-footnote text-muted-foreground">{barber.specialties[0]}</span>
              <NextFreeLabel
                barberId={barber.id}
                duration={TYPICAL_DURATION}
                className="mt-3 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular"
              />
            </button>
          ))}
        </div>
      </Section>

      <Section title="ביקור במספרה">
        <VisitCard />
      </Section>
    </ScrollScreen>
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
