import { useCallback, useEffect, useRef, useState } from 'react'

import type { Appointment, TimeSlot } from '@/api'
import type { BookingRequest } from '@/store/types'

export type StepId = 'service' | 'barber' | 'date' | 'time' | 'review' | 'done' | 'waitlisted'

/** Everything chosen so far. Kept intact while moving back and forth between steps. */
export type Selection = {
  serviceId?: string
  /** A barber id, or "any". */
  barberId?: string
  /** YYYY-MM-DD */
  date?: string
  /** HH:mm */
  time?: string
  /** The barber who will actually take the slot (resolves "any"). */
  assignedBarberId?: string
}

const NEW_BOOKING: StepId[] = ['service', 'barber', 'date', 'time', 'review']
const RESCHEDULE: StepId[] = ['date', 'time', 'review']
const TERMINAL: StepId[] = ['done', 'waitlisted']
/** Pause after a tap so the selection is seen before the screen changes. */
const ADVANCE_DELAY = 240

function initialSelection(request: BookingRequest, existing?: Appointment): Selection {
  if (existing) return { serviceId: existing.serviceId, barberId: existing.barberId }
  return request.mode === 'new' ? { serviceId: request.serviceId, barberId: request.barberId } : {}
}

/** The first step still missing an answer; pre-filled choices are skipped. */
const firstStep = (steps: StepId[], selection: Selection): StepId =>
  steps.find((s) => (s === 'service' && !selection.serviceId) || (s === 'barber' && !selection.barberId)) ?? 'date'

/** Step navigation and selections for the booking sheet. */
export function useBookingFlow(request: BookingRequest, existing?: Appointment) {
  const steps = existing ? RESCHEDULE : NEW_BOOKING
  const [initial] = useState(() => initialSelection(request, existing))
  const [selection, setSelection] = useState<Selection>(initial)
  const [nav, setNav] = useState<{ step: StepId; direction: number }>({ step: firstStep(steps, initial), direction: 0 })
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const order = useCallback((s: StepId) => (TERMINAL.includes(s) ? steps.length : steps.indexOf(s)), [steps])

  const goTo = useCallback(
    (to: StepId) => {
      window.clearTimeout(timer.current)
      setNav(({ step }) => ({ step: to, direction: order(to) >= order(step) ? 1 : -1 }))
    },
    [order],
  )

  /** Moves past `from` after a short pause, unless the customer has already navigated elsewhere. */
  const advanceFrom = useCallback(
    (from: StepId) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setNav((current) => (current.step === from ? { step: steps[steps.indexOf(from) + 1], direction: 1 } : current))
      }, ADVANCE_DELAY)
    },
    [steps],
  )

  const index = steps.indexOf(nav.step)

  return {
    steps,
    step: nav.step,
    direction: nav.direction,
    /** Position in `steps`; -1 on a terminal screen. */
    index,
    isTerminal: TERMINAL.includes(nav.step),
    selection,
    goTo,
    back: () => index > 0 && goTo(steps[index - 1]),
    next: () => goTo(steps[index + 1]),

    chooseService(serviceId: string) {
      setSelection((s) => ({ ...s, serviceId, time: undefined, assignedBarberId: undefined }))
      advanceFrom('service')
    },
    chooseBarber(barberId: string) {
      setSelection((s) => ({ ...s, barberId, time: undefined, assignedBarberId: undefined }))
      advanceFrom('barber')
    },
    /** Picking a day always opens its time screen — including full days, which offer the waiting list. */
    chooseDate(date: string) {
      setSelection((s) => (s.date === date ? s : { ...s, date, time: undefined, assignedBarberId: undefined }))
      advanceFrom('date')
    },
    chooseTime(slot: TimeSlot) {
      setSelection((s) => ({
        ...s,
        time: slot.time,
        assignedBarberId: s.barberId === 'any' ? slot.barberIds[0] : s.barberId,
      }))
    },
  }
}

export type BookingFlow = ReturnType<typeof useBookingFlow>
