import { createContext, useContext } from 'react'

import type { Appearance, Appointment, BookingRequest, LookViewer, Preferences, Tab } from './types'

export type AppContextValue = {
  now: Date
  tab: Tab
  setTab: (tab: Tab) => void

  appointments: Appointment[]
  upcoming: Appointment[]
  past: Appointment[]
  /** Adds a new appointment or replaces one with the same id. */
  saveAppointment: (appointment: Appointment) => void
  cancel: (id: string) => void

  appearance: Appearance
  setAppearance: (appearance: Appearance) => void
  preferences: Preferences
  setPreference: (key: keyof Preferences, value: boolean) => void

  booking: { open: boolean; request: BookingRequest; session: number }
  openBooking: (request?: BookingRequest) => void
  closeBooking: () => void

  look: LookViewer
  openLook: (id: string, source: string) => void
  closeLook: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
