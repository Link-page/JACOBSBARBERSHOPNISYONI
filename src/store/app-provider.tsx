import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { hoursFor } from '@/booking/availability'
import { useNow } from '@/hooks/use-now'
import { addDays, combine, dayKey, toMinutes } from '@/lib/date'
import { newId } from '@/lib/id'

import { AppContext, type AppContextValue } from './app-context'
import type { Appearance, Appointment, BookingRequest, LookViewer, Preferences, Tab } from './types'

const STORAGE_KEY = 'jacobs.v1'

type Persisted = {
  appointments: Appointment[]
  appearance: Appearance
  preferences: Preferences
}

function load(): Partial<Persisted> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Persisted>
  } catch {
    return {}
  }
}

function save(data: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Private mode or storage disabled — the app still works for this visit.
  }
}

/** Nearest day (searching in `step` direction) the shop is open until at least 20:00. */
function fullDayFrom(date: Date, step: 1 | -1) {
  let d = date
  for (let i = 0; i < 7; i++) {
    const h = hoursFor(d)
    if (h && toMinutes(h.close) >= toMinutes('20:00')) return d
    d = addDays(d, step)
  }
  return date
}

/** A believable history for first launch. */
function seedAppointments(now: Date): Appointment[] {
  const at = (date: Date, time: string) => combine(dayKey(date), time).toISOString()
  return [
    { id: newId(), serviceId: 'signature', barberId: 'jacob', start: at(fullDayFrom(addDays(now, 2), 1), '17:30'), status: 'booked' },
    { id: newId(), serviceId: 'skin-fade', barberId: 'eli', start: at(fullDayFrom(addDays(now, -23), -1), '12:00'), status: 'booked' },
    { id: newId(), serviceId: 'cut-beard', barberId: 'jacob', start: at(fullDayFrom(addDays(now, -51), -1), '18:00'), status: 'booked' },
  ]
}

const themeColor = { light: '#f4f3ef', dark: '#0c0c0b' }

export function AppProvider({ children }: { children: ReactNode }) {
  const now = useNow()
  const [initial] = useState(load)

  const [tab, setTab] = useState<Tab>('home')
  const [appointments, setAppointments] = useState<Appointment[]>(
    () => initial.appointments ?? seedAppointments(new Date()),
  )
  const [appearance, setAppearance] = useState<Appearance>(initial.appearance ?? 'system')
  const [preferences, setPreferences] = useState<Preferences>(
    initial.preferences ?? { reminders: true, offers: false },
  )
  const [booking, setBooking] = useState<AppContextValue['booking']>({
    open: false,
    request: { mode: 'new' },
    session: 0,
  })
  const [look, setLook] = useState<LookViewer>(null)

  useEffect(() => save({ appointments, appearance, preferences }), [appointments, appearance, preferences])

  // Light / dark — follows the system unless the user picks one.
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = appearance === 'dark' || (appearance === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? themeColor.dark : themeColor.light)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])

  const { upcoming, past } = useMemo(() => {
    const t = now.getTime()
    const byStart = (a: Appointment) => new Date(a.start).getTime()
    return {
      upcoming: appointments
        .filter((a) => a.status === 'booked' && byStart(a) > t)
        .sort((a, b) => byStart(a) - byStart(b)),
      past: appointments
        .filter((a) => a.status === 'cancelled' || byStart(a) <= t)
        .sort((a, b) => byStart(b) - byStart(a)),
    }
  }, [appointments, now])

  const saveAppointment = useCallback((appointment: Appointment) => {
    setAppointments((list) =>
      list.some((a) => a.id === appointment.id)
        ? list.map((a) => (a.id === appointment.id ? appointment : a))
        : [...list, appointment],
    )
  }, [])

  const cancel = useCallback((id: string) => {
    setAppointments((list) => list.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)))
  }, [])

  const setPreference = useCallback((key: keyof Preferences, value: boolean) => {
    setPreferences((p) => ({ ...p, [key]: value }))
  }, [])

  const openBooking = useCallback((request: BookingRequest = { mode: 'new' }) => {
    setLook(null)
    setBooking((b) => ({ open: true, request, session: b.session + 1 }))
  }, [])

  const closeBooking = useCallback(() => setBooking((b) => ({ ...b, open: false })), [])
  const openLook = useCallback((id: string, source: string) => setLook({ id, source }), [])
  const closeLook = useCallback(() => setLook(null), [])

  const value = useMemo<AppContextValue>(
    () => ({
      now,
      tab,
      setTab,
      appointments,
      upcoming,
      past,
      saveAppointment,
      cancel,
      appearance,
      setAppearance,
      preferences,
      setPreference,
      booking,
      openBooking,
      closeBooking,
      look,
      openLook,
      closeLook,
    }),
    [now, tab, appointments, upcoming, past, saveAppointment, cancel, appearance, preferences, setPreference, booking, openBooking, closeBooking, look, openLook, closeLook],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

