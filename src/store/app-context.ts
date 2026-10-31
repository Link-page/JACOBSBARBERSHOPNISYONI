import { createContext, useContext } from 'react'

import type { Appearance, Appointment, BookingRequest, LookViewer, Tab } from './types'

export type AppContextValue = {
  now: Date
  tab: Tab
  setTab: (tab: Tab) => void

  appointments: Appointment[]
  upcoming: Appointment[]
  past: Appointment[]
  /** Adds a new appointment or replaces one with the same id. */
  saveAppointment: (appointment: Appointment) => void
  /** Cancels on the server; resolves with the reason when it is refused. */
  cancel: (id: string) => Promise<string | null>

  appearance: Appearance
  setAppearance: (appearance: Appearance) => void

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
