import { createContext, useContext } from 'react'

import type { Appointment, TimeBlock } from '../../data/types'
import type { AppointmentPrefill } from './appointment-form-sheet'

export type SheetControls = {
  newAppointment: (prefill: AppointmentPrefill) => void
  showAppointment: (appointment: Appointment) => void
  blockTime: (date: string) => void
  showBlock: (block: TimeBlock) => void
  newCustomer: () => void
}

export const SheetsContext = createContext<SheetControls | null>(null)

/** Opens the shared appointment, block-time and customer sheets from any screen. */
export function useAppointmentSheets() {
  const ctx = useContext(SheetsContext)
  if (!ctx) throw new Error('useAppointmentSheets must be used inside <AppointmentSheetsProvider>')
  return ctx
}
