import { useMemo, useState, type ReactNode } from 'react'

import { CustomerFormSheet } from '../customers/customer-form-sheet'
import type { Appointment } from '../../data/types'
import { AppointmentFormSheet, type AppointmentPrefill } from './appointment-form-sheet'
import { AppointmentSheet } from './appointment-sheet'
import { BlockTimeSheet } from './block-time-sheet'
import { SheetsContext, type SheetControls } from './use-appointment-sheets'

type Open =
  | { kind: 'new'; prefill: AppointmentPrefill }
  | { kind: 'details'; appointment: Appointment }
  | { kind: 'block'; date: string }
  | { kind: 'customer' }
  | null


/** Hosts the appointment-related sheets once, so any screen (dashboard, calendar, customers) can open them. */
export function AppointmentSheetsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open>(null)
  const close = () => setOpen(null)
  const controls = useMemo<SheetControls>(
    () => ({
      newAppointment: (prefill) => setOpen({ kind: 'new', prefill }),
      showAppointment: (appointment) => setOpen({ kind: 'details', appointment }),
      blockTime: (date) => setOpen({ kind: 'block', date }),
      newCustomer: () => setOpen({ kind: 'customer' }),
    }),
    [],
  )

  return (
    <SheetsContext.Provider value={controls}>
      {children}
      {open?.kind === 'new' && <AppointmentFormSheet prefill={open.prefill} onClose={close} />}
      {open?.kind === 'details' && <AppointmentSheet appointment={open.appointment} onClose={close} />}
      {open?.kind === 'block' && <BlockTimeSheet date={open.date} onClose={close} />}
      {open?.kind === 'customer' && <CustomerFormSheet onClose={close} />}
    </SheetsContext.Provider>
  )
}
