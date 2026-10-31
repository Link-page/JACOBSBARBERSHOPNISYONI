import { ChevronLeft, X } from 'lucide-react'
import { AnimatePresence, m, type Variants } from 'motion/react'
import { useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { barberById, barbers, serviceById } from '@/data/shop'
import { addToCalendar } from '@/lib/calendar'
import { formatPrice, shortDate } from '@/lib/format'
import { spring } from '@/lib/motion'
import { combine, fromDayKey, slotsFor } from '@/lib/schedule'
import { useApp } from '@/store/app-context'
import type { Appointment, BookingRequest } from '@/store/types'

import { BarberStep, DoneStep, ReviewStep, ServiceStep, TimeStep } from './steps'

type StepId = 'service' | 'barber' | 'time' | 'review' | 'done'

const titles: Record<StepId, string> = {
  service: 'Choose a Service',
  barber: 'Choose a Barber',
  time: 'Pick a Time',
  review: 'Review',
  done: '',
}

const variants: Variants = {
  enter: (direction: number) => ({ x: direction * 56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { x: spring, opacity: { duration: 0.2 } } },
  exit: (direction: number) => ({ x: direction * -56, opacity: 0, transition: { duration: 0.14 } }),
}

export function BookingSheet() {
  const { booking, closeBooking } = useApp()
  return (
    <Drawer open={booking.open} onOpenChange={(open) => !open && closeBooking()} shouldScaleBackground>
      <DrawerContent className="h-[94dvh]" aria-describedby={undefined}>
        {/* A new session remounts the flow so every booking starts fresh. */}
        <BookingFlow key={booking.session} request={booking.request} onClose={closeBooking} />
      </DrawerContent>
    </Drawer>
  )
}

function BookingFlow({ request, onClose }: { request: BookingRequest; onClose: () => void }) {
  const { now, appointments, book, reschedule } = useApp()

  const existing = request.mode === 'reschedule' ? appointments.find((a) => a.id === request.appointmentId) : undefined
  const steps: StepId[] = existing ? ['time', 'review'] : ['service', 'barber', 'time', 'review']

  const [serviceId, setServiceId] = useState(existing?.serviceId ?? (request.mode === 'new' ? request.serviceId : undefined))
  const [barberId, setBarberId] = useState(existing?.barberId ?? (request.mode === 'new' ? request.barberId : undefined))
  const [day, setDay] = useState<string>()
  const [time, setTime] = useState<string>()
  const [confirmed, setConfirmed] = useState<Appointment>()
  const [[step, direction], setStepState] = useState<[StepId, number]>(() => [
    existing ? 'time' : !serviceId ? 'service' : !barberId ? 'barber' : 'time',
    0,
  ])
  const advanceTimer = useRef<number>(undefined)

  const index = steps.indexOf(step)
  const service = serviceId ? serviceById(serviceId) : undefined

  // When "Any barber" is chosen, the first free barber for the slot is assigned.
  const assignedBarberId = useMemo(() => {
    if (barberId !== 'any' || !day || !time || !service) return barberId
    return slotsFor(fromDayKey(day), 'any', service.duration, now).find((s) => s.time === time)?.barberIds[0] ?? barbers[0].id
  }, [barberId, day, time, service, now])

  const order = (s: StepId) => (s === 'done' ? steps.length : steps.indexOf(s))

  const goTo = (to: StepId) => {
    window.clearTimeout(advanceTimer.current)
    setStepState(([from]) => [to, order(to) >= order(from) ? 1 : -1])
  }

  /** Lists advance on their own after a selection — one tap per decision. */
  const advanceAfterSelect = (from: StepId) => {
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => {
      setStepState(([current, d]) => (current === from ? [steps[steps.indexOf(from) + 1], 1] : [current, d]))
    }, 280)
  }

  const canContinue =
    step === 'service' ? !!serviceId : step === 'barber' ? !!barberId : step === 'time' ? !!day && !!time : true

  const confirm = () => {
    if (!service || !assignedBarberId || !day || !time) return
    const start = combine(day, time)
    const result = existing
      ? reschedule(existing.id, start, assignedBarberId)
      : book({ serviceId: service.id, barberId: assignedBarberId, start })
    if (result) {
      setConfirmed(result)
      goTo('done')
    }
  }

  const summary = [
    service?.name,
    barberId && (barberId === 'any' ? 'Any barber' : barberById(barberId).name),
    day && time && `${shortDate(fromDayKey(day))}, ${time}`,
  ].filter(Boolean)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Navigation bar */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-4 pt-2">
        <div>
          {index > 0 && step !== 'done' && (
            <Button variant="glass" size="icon-lg" onClick={() => goTo(steps[index - 1])} aria-label="Back">
              <ChevronLeft strokeWidth={2.5} />
            </Button>
          )}
        </div>
        <div className="text-center">
          <DrawerTitle>{step === 'done' ? (existing ? 'Rescheduled' : 'Booked') : existing ? 'Reschedule' : titles[step]}</DrawerTitle>
          {step !== 'done' && (
            <p className="text-caption text-muted-foreground tabular">
              Step {index + 1} of {steps.length}
            </p>
          )}
        </div>
        <DrawerClose asChild>
          <Button variant="glass" size="icon-lg" aria-label="Close">
            <X strokeWidth={2.5} />
          </Button>
        </DrawerClose>
      </div>

      {step !== 'done' && (
        <div className="mx-5 mt-3 flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <m.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: i <= index ? '100%' : '0%' }}
                transition={spring}
              />
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="scrollbar-none relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="px-5 pt-5 pb-8"
          >
            {step === 'service' && (
              <ServiceStep
                value={serviceId}
                onChange={(id) => {
                  setServiceId(id)
                  setTime(undefined)
                  advanceAfterSelect('service')
                }}
              />
            )}
            {step === 'barber' && service && (
              <BarberStep
                value={barberId}
                duration={service.duration}
                onChange={(id) => {
                  setBarberId(id)
                  setTime(undefined)
                  advanceAfterSelect('barber')
                }}
              />
            )}
            {step === 'time' && service && barberId && (
              <TimeStep
                barberId={barberId}
                duration={service.duration}
                day={day}
                time={time}
                onDayChange={(d) => {
                  setDay(d)
                  setTime(undefined)
                }}
                onTimeChange={setTime}
              />
            )}
            {step === 'review' && service && assignedBarberId && day && time && (
              <ReviewStep
                service={service}
                barberId={assignedBarberId}
                anyBarber={barberId === 'any'}
                start={combine(day, time)}
                previous={existing}
              />
            )}
            {step === 'done' && confirmed && <DoneStep appointment={confirmed} rescheduled={!!existing} />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Action bar */}
      <div className="glass-bar px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[inset_0_0.5px_0_0_var(--border)]">
        {step === 'done' && confirmed ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => addToCalendar(confirmed)}>
              Add to Calendar
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {summary.length > 0 && step !== 'review' && (
              <div className="mb-3 flex items-center justify-between gap-3 text-subhead">
                <span className="truncate text-muted-foreground">{summary.join(' · ')}</span>
                {service && <span className="shrink-0 font-semibold tabular">{formatPrice(service.price)}</span>}
              </div>
            )}
            <Button
              className="w-full"
              disabled={!canContinue}
              onClick={() => (step === 'review' ? confirm() : goTo(steps[index + 1]))}
            >
              {step === 'review'
                ? existing
                  ? 'Confirm New Time'
                  : `Confirm Booking · ${formatPrice(service?.price ?? 0)}`
                : 'Continue'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
