import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useNow } from '@/hooks/use-now'

import { AppContext, type AppContextValue } from './app-context'
import type { Appearance, BookingRequest, LookViewer, Tab } from './types'
import { useAppointments } from './use-appointments'

const STORAGE_KEY = 'jacobs.v1'

type Persisted = {
  appearance: Appearance
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

const themeColor = { light: '#f4f3ef', dark: '#0c0c0b' }

export function AppProvider({ children }: { children: ReactNode }) {
  const now = useNow()
  const [initial] = useState(load)

  const [tab, setTab] = useState<Tab>('home')
  const [appearance, setAppearance] = useState<Appearance>(initial.appearance ?? 'system')
  const [booking, setBooking] = useState<AppContextValue['booking']>({
    open: false,
    request: { mode: 'new' },
    session: 0,
  })
  const [look, setLook] = useState<LookViewer>(null)

  useEffect(() => save({ appearance }), [appearance])

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

  const { appointments, upcoming, past, saveAppointment, cancel } = useAppointments(now)

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
      booking,
      openBooking,
      closeBooking,
      look,
      openLook,
      closeLook,
    }),
    [now, tab, appointments, upcoming, past, saveAppointment, cancel, appearance, booking, openBooking, closeBooking, look, openLook, closeLook],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

