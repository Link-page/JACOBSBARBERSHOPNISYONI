import { Ban, CalendarPlus, Clock, Hourglass, UserPlus } from 'lucide-react'

import { useStaff } from '../../auth/staff-context'
import { isOwner } from '../../lib/permissions'
import { navigate } from '../../lib/router'
import { useAppointmentSheets } from '../appointments/use-appointment-sheets'

/** Everyday shortcuts; a horizontal row on phones, a grid on desktop. */
export function QuickActions({ today }: { today: string }) {
  const staff = useStaff()
  const sheets = useAppointmentSheets()
  const actions = [
    { label: 'תור חדש', icon: CalendarPlus, run: () => sheets.newAppointment({ date: today }), primary: true },
    { label: 'חסימת זמן', icon: Ban, run: () => sheets.blockTime(today) },
    ...(isOwner(staff) ? [{ label: 'שעות פעילות', icon: Clock, run: () => navigate('barbers') }] : []),
    { label: 'רשימת המתנה', icon: Hourglass, run: () => navigate('waitlist') },
    { label: 'לקוח חדש', icon: UserPlus, run: () => sheets.newCustomer() },
  ]

  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:px-0">
      {actions.map(({ label, icon: Icon, run, primary }) => (
        <button
          key={label}
          type="button"
          onClick={run}
          className={
            primary
              ? 'pressable flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-subhead font-semibold text-primary-foreground lg:justify-center'
              : 'pressable flex h-12 shrink-0 items-center gap-2 rounded-full bg-card px-5 text-subhead font-medium shadow-elevation lg:justify-center'
          }
        >
          <Icon className={primary ? 'size-[18px]' : 'size-[18px] text-brass'} strokeWidth={1.9} />
          {label}
        </button>
      ))}
    </div>
  )
}
