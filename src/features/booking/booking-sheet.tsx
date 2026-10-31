import { useState } from 'react'

import type { Appointment } from '@/api'
import { backend } from '@/backend'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { ResponsivePanel } from '@/components/responsive-panel'
import { useDaySlots } from '@/hooks/use-availability'
import { useApp } from '@/store/app-context'
import type { BookingRequest } from '@/store/types'

import { BookingActions } from './booking-actions'
import { BookingHeader } from './booking-header'
import { useConfirmBooking } from './hooks/use-confirm-booking'
import { useJoinWaitlist } from './hooks/use-join-waitlist'
import { StepStage } from './step-stage'
import { BarberStep } from './steps/barber-step'
import { DateStep } from './steps/date-step'
import { DoneStep } from './steps/done-step'
import { ReviewStep } from './steps/review-step'
import { ServiceStep } from './steps/service-step'
import { TimeStep } from './steps/time-step'
import { WaitlistDoneStep } from './steps/waitlist-done-step'
import { useBookingFlow, type StepId } from './use-booking-flow'

const titles: Record<StepId, string> = {
  service: 'בחירת טיפול',
  barber: 'בחירת ספר',
  date: 'בחירת יום',
  time: 'בחירת שעה',
  review: 'סיכום',
  done: '',
  waitlisted: 'רשימת המתנה',
}

export function BookingSheet() {
  const { booking, closeBooking } = useApp()
  return (
    <ResponsivePanel
      open={booking.open}
      onOpenChange={(open) => !open && closeBooking()}
      scaleBackground
      drawerClassName="h-[94dvh]"
      dialogClassName="h-[min(860px,90dvh)] max-h-none w-[min(540px,calc(100vw-48px))] overflow-hidden"
    >
      {/* A new session remounts the flow so every booking starts fresh. */}
      <BookingFlowView key={booking.session} request={booking.request} onClose={closeBooking} />
    </ResponsivePanel>
  )
}

/** Wires the flow's state to its screens, data and actions. */
function BookingFlowView({ request, onClose }: { request: BookingRequest; onClose: () => void }) {
  const { appointments } = useApp()
  const [existing] = useState(() =>
    request.mode === 'reschedule' ? appointments.find((a) => a.id === request.appointmentId) : undefined,
  )
  const flow = useBookingFlow(request, existing)
  const { serviceById } = useCatalogue()
  const { selection } = flow
  const service = selection.serviceId ? serviceById(selection.serviceId) : undefined
  const query = service && selection.barberId ? { serviceId: service.id, barberId: selection.barberId, duration: service.duration } : null

  // Shared by the time screen and the action bar (which offers the waiting list on full days).
  const daySlots = useDaySlots(selection.date, query)
  const booking = useConfirmBooking(existing)
  const waitlist = useJoinWaitlist()
  const [confirmed, setConfirmed] = useState<Appointment>()

  const confirm = async () => {
    const { serviceId, assignedBarberId, date, time } = selection
    if (!serviceId || !assignedBarberId || !date || !time) return
    const appointment = await booking.confirm({ serviceId, barberId: assignedBarberId, date, time })
    if (appointment) {
      setConfirmed(appointment)
      flow.goTo('done')
    }
  }

  const joinWaitlist = async () => {
    const { serviceId, barberId, date } = selection
    if (!serviceId || !barberId || !date) return
    if (await waitlist.join({ serviceId, barberId, date })) flow.goTo('waitlisted')
  }

  const title =
    flow.step === 'done' ? (existing ? 'המועד עודכן' : backend.booking.connected ? 'התור נקבע' : 'התור נשמר') : existing && flow.step !== 'waitlisted' ? 'שינוי מועד' : titles[flow.step]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BookingHeader flow={flow} title={title} />

      <StepStage stepKey={flow.step} direction={flow.direction}>
        {flow.step === 'service' && <ServiceStep value={selection.serviceId} onChange={flow.chooseService} />}
        {flow.step === 'barber' && service && (
          <BarberStep value={selection.barberId} serviceId={service.id} duration={service.duration} onChange={flow.chooseBarber} />
        )}
        {flow.step === 'date' && service && selection.barberId && query && (
          <DateStep
            serviceId={service.id}
            barberId={selection.barberId}
            query={query}
            selected={selection.date}
            onSelect={flow.chooseDate}
          />
        )}
        {flow.step === 'time' && service && selection.barberId && selection.date && (
          <TimeStep
            date={selection.date}
            serviceId={service.id}
            barberId={selection.barberId}
            duration={service.duration}
            slots={daySlots}
            selectedTime={selection.time}
            waitlistError={waitlist.error}
            onSelect={flow.chooseTime}
            onChooseAnotherDay={() => flow.goTo('date')}
          />
        )}
        {flow.step === 'review' && service && selection.assignedBarberId && selection.date && selection.time && (
          <ReviewStep
            serviceId={service.id}
            barberId={selection.assignedBarberId}
            anyBarber={selection.barberId === 'any'}
            date={selection.date}
            time={selection.time}
            previous={existing}
          />
        )}
        {flow.step === 'done' && confirmed && (
          <DoneStep appointment={confirmed} rescheduled={!!existing} connected={backend.booking.connected} />
        )}
        {flow.step === 'waitlisted' && waitlist.state.status === 'done' && (
          <WaitlistDoneStep receipt={waitlist.state.receipt} connected={backend.booking.connected} />
        )}
      </StepStage>

      <BookingActions
        flow={flow}
        rescheduling={!!existing}
        daySlots={daySlots.data}
        confirming={booking.status === 'pending'}
        confirmError={booking.error}
        joiningWaitlist={waitlist.state.status === 'pending'}
        confirmed={confirmed}
        onConfirm={confirm}
        onJoinWaitlist={joinWaitlist}
        onClose={onClose}
      />
    </div>
  )
}
