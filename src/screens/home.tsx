import { CalendarPlus, ChevronRight, Scissors } from 'lucide-react'
import { m } from 'motion/react'
import { useMemo } from 'react'

import { AppointmentPass } from '@/components/appointment-pass'
import { BarberAvatar } from '@/components/barber-avatar'
import { ListGroup, ListRow } from '@/components/list'
import { LookCard } from '@/components/look-card'
import { ScrollScreen } from '@/components/scroll-screen'
import { Section } from '@/components/section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { VisitCard } from '@/components/visit-card'
import { barberById, barbers, looks, services, user } from '@/data/shop'
import { eyebrowDate, formatDuration, formatPrice, greeting, slotLabel } from '@/lib/format'
import { nextAvailable } from '@/lib/schedule'
import { useApp } from '@/store/app-context'

export function HomeScreen() {
  const { now, upcoming, setTab, openBooking } = useApp()
  const next = upcoming[0]
  const firstSlot = useMemo(() => nextAvailable(now), [now])

  return (
    <ScrollScreen
      title="Jacob's"
      eyebrow={eyebrowDate(now)}
      largeTitle={`${greeting(now)}, ${user.firstName}`}
      accessory={
        <button type="button" onClick={() => setTab('profile')} className="pressable rounded-full" aria-label="Profile">
          <Avatar aria-hidden className="size-10">
            <AvatarFallback className="text-subhead">{user.initials}</AvatarFallback>
          </Avatar>
        </button>
      }
    >
      <div className="mt-6">
        {next ? <AppointmentPass appointment={next} /> : <NoAppointmentCard onClick={() => openBooking()} />}
      </div>

      <div className="mt-4">
        <Button size="lg" className="w-full" onClick={() => openBooking()}>
          <CalendarPlus className="size-[21px]" />
          Book an Appointment
        </Button>
        {firstSlot && (
          <p className="mt-2.5 text-center text-footnote text-muted-foreground">
            Next available · {slotLabel(firstSlot.date, firstSlot.time, now)} with {barberById(firstSlot.barberId).name}
          </p>
        )}
      </div>

      <Section title="Lookbook" onTitleClick={() => setTab('lookbook')}>
        <m.div layoutScroll className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5">
          {looks.map((look) => (
            <div key={look.id} className="w-[158px] shrink-0 snap-start">
              <LookCard look={look} source="home" ratio={1.32} />
            </div>
          ))}
        </m.div>
      </Section>

      <Section title="Services">
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

      <Section title="Barbers">
        <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5">
          {barbers.map((barber) => {
            const slot = nextAvailable(now, barber.id)
            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => openBooking({ mode: 'new', barberId: barber.id })}
                className="pressable flex w-[140px] shrink-0 snap-start flex-col items-center rounded-[26px] bg-card px-3 pt-5 pb-4 text-center"
              >
                <BarberAvatar barber={barber} className="size-[68px] text-[26px]" />
                <span className="mt-3 text-headline font-semibold">{barber.name}</span>
                <span className="line-clamp-1 text-footnote text-muted-foreground">{barber.specialties[0]}</span>
                <span className="mt-3 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular">
                  {slot ? slotLabel(slot.date, slot.time, now) : 'Fully booked'}
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Visit Us">
        <VisitCard />
      </Section>
    </ScrollScreen>
  )
}

function NoAppointmentCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex w-full items-center gap-4 rounded-[28px] bg-card p-5 text-left">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Scissors className="size-[22px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-headline font-semibold">No upcoming appointments</p>
        <p className="text-subhead text-muted-foreground">Your chair is waiting.</p>
      </div>
      <ChevronRight className="size-5 text-tertiary" />
    </button>
  )
}
