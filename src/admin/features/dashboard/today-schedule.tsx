import { CalendarCheck } from 'lucide-react'

import { EmptyState, ListSkeleton } from '../../components/empty-state'
import { Panel } from '../../components/field'
import { StatusBadge } from '../../components/status-badge'
import { useCatalogue } from '../../components/use-catalogue'
import type { Appointment } from '../../data/types'
import { useAppointmentSheets } from '../appointments/use-appointment-sheets'
import { timeOf } from '../appointments/time'

export function TodaySchedule({ appointments, loading }: { appointments: Appointment[]; loading: boolean }) {
  const { serviceName, barberName, barbers } = useCatalogue()
  const { showAppointment } = useAppointmentSheets()
  const multipleBarbers = barbers.filter((b) => b.active).length > 1

  return (
    <Panel title="היום">
      {loading ? (
        <ListSkeleton rows={3} />
      ) : appointments.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="אין תורים היום" />
      ) : (
        <ul className="flex flex-col gap-2">
          {appointments.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => showAppointment(a)}
                className="pressable flex w-full items-center gap-4 rounded-[18px] bg-muted px-4 py-3 text-start"
              >
                <span className="w-12 font-display text-title3 leading-none font-medium tabular">{timeOf(a.startsAt)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{a.customerName}</span>
                  <span className="block truncate text-footnote text-muted-foreground">
                    {serviceName(a.serviceId)}
                    {multipleBarbers && ` · ${barberName(a.barberId)}`}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
