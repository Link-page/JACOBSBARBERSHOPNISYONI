import { useMemo } from 'react'

import { useNow } from '@/hooks/use-now'
import { addDays, dayKey, fromDayKey, toMinutes } from '@/lib/date'

import { useStaff } from '../../auth/staff-context'
import { PageHeader } from '../../components/page-header'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminQuery } from '../../data/api-context'
import { visibleBarbers } from '../../lib/permissions'
import { setParams, useRoute } from '../../lib/router'
import { useIsDesktop } from '../../lib/use-media-query'
import { useAppointmentSheets } from '../appointments/use-appointment-sheets'
import { toIso } from '../appointments/time'
import { shiftDate, viewTitle, visibleDays, type CalendarView } from './calendar-range'
import { CalendarToolbar } from './calendar-toolbar'
import { DayStrip } from './day-strip'
import { MonthGrid } from './month-grid'
import { PhoneAgenda } from './phone-agenda'
import { TimeGrid, type GridColumn } from './time-grid'

export function CalendarPage() {
  const staff = useStaff()
  const desktop = useIsDesktop()
  const now = useNow(60_000)
  const today = dayKey(now)
  const { params } = useRoute()
  const { barbers } = useCatalogue()
  const sheets = useAppointmentSheets()

  const view = (params.get('view') as CalendarView) || 'day'
  const date = params.get('date') || today
  const chairs = visibleBarbers(staff, barbers).filter((b) => b.active)
  const barberParam = params.get('barber') || (chairs.length > 1 ? 'all' : (chairs[0]?.id ?? 'all'))
  const shownBarbers = barberParam === 'all' ? chairs : chairs.filter((b) => b.id === barberParam)

  const days = useMemo(() => visibleDays(view, date), [view, date])
  const range = { from: days[0], to: dayKey(addDays(fromDayKey(days.at(-1)!), 1)) }
  const appointments = useAdminQuery(`appointments|${range.from}|${range.to}`, (api) => api.appointments.list(range))
  const blocks = useAdminQuery(`blocks|${range.from}|${range.to}`, (api) => api.schedule.blocks(range))
  const shownIds = new Set(shownBarbers.map((b) => b.id))
  const list = (appointments.data ?? []).filter((a) => shownIds.has(a.barberId) || chairs.length === 0)
  const blockList = (blocks.data ?? []).filter((b) => b.barberId === null || shownIds.has(b.barberId))

  // Grid hours span every shown barber's working day.
  const hours = shownBarbers.flatMap((b) => b.hours)
  const gridRange = hours.length
    ? { start: Math.floor(Math.min(...hours.map((h) => toMinutes(h.start))) / 60) * 60, end: Math.ceil(Math.max(...hours.map((h) => toMinutes(h.end))) / 60) * 60 }
    : { start: 8 * 60, end: 21 * 60 }

  const columns: GridColumn[] =
    view === 'day'
      ? (shownBarbers.length > 0 ? shownBarbers : [null]).map((b) => ({ key: b?.id ?? 'all', label: b?.name ?? 'יומן', date, barberId: b?.id ?? null }))
      : days.map((d) => ({
          key: d,
          label: fromDayKey(d).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' }),
          date: d,
          barberId: shownBarbers.length === 1 ? shownBarbers[0].id : null,
          highlight: d === today,
        }))

  const goTo = (next: Record<string, string>) => setParams({ view, date, barber: barberParam, ...next })
  const newAt = (day: string, time?: string, barberId?: string | null) =>
    sheets.newAppointment({ date: day, startsAt: time ? toIso(day, time) : undefined, barberId: barberId ?? (shownBarbers.length === 1 ? shownBarbers[0].id : undefined) })

  return (
    <div>
      {!desktop && <PageHeader title="יומן" />}
      <CalendarToolbar
        view={view}
        title={viewTitle(view, date)}
        barbers={chairs}
        barberId={barberParam}
        onView={(v) => goTo({ view: v })}
        onShift={(delta) => goTo({ date: shiftDate(view, date, delta) })}
        onToday={() => goTo({ date: today })}
        onBarber={(id) => goTo({ barber: id })}
        onNew={() => newAt(date)}
        onBlock={() => sheets.blockTime(date)}
      />

      {view === 'month' ? (
        <MonthGrid
          days={days}
          month={date.slice(0, 7)}
          today={today}
          appointments={list}
          blocks={blockList}
          onPick={(d) => goTo({ view: 'day', date: d })}
        />
      ) : desktop ? (
        <TimeGrid
          columns={columns}
          appointments={list}
          blocks={blockList}
          range={gridRange}
          onEmptyClick={(d, time, barberId) => newAt(d, time, barberId)}
          onAppointmentClick={sheets.showAppointment}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {view === 'day' && <DayStrip days={visibleDays('week', date)} value={date} today={today} onChange={(d) => goTo({ date: d })} />}
          <PhoneAgenda days={days} appointments={list} blocks={blockList} onAppointment={sheets.showAppointment} />
        </div>
      )}
    </div>
  )
}
