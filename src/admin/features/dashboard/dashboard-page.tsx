import { CalendarCheck2, CalendarClock, CircleCheck, Coins, Gauge, Hourglass, Timer, XCircle } from 'lucide-react'
import { useMemo } from 'react'

import { useNow } from '@/hooks/use-now'
import { addDays, dayKey } from '@/lib/date'
import { formatPrice, fullDate } from '@/lib/format'

import { useStaff } from '../../auth/staff-context'
import { PageHeader } from '../../components/page-header'
import { useAdminQuery } from '../../data/api-context'
import { freeSlots, occupancy, perDay, summarize } from '../../lib/stats'
import { KpiTiles, type Kpi } from './kpi-tiles'
import { QuickActions } from './quick-actions'
import { TodaySchedule } from './today-schedule'
import { WeekChart } from './week-chart'

export function DashboardPage() {
  const staff = useStaff()
  const now = useNow(60_000)
  const today = dayKey(now)
  const dates = useMemo(() => {
    const weekStart = addDays(now, -now.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const week = Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i)))
    return {
      week,
      weekRange: { from: week[0], to: dayKey(addDays(weekStart, 7)) },
      monthRange: { from: dayKey(monthStart), to: dayKey(monthEnd) },
      fetch: { from: dayKey(weekStart < monthStart ? weekStart : monthStart), to: dayKey(addDays(now, 8) > monthEnd ? addDays(now, 8) : monthEnd) },
    }
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  const appointments = useAdminQuery(`appointments|${dates.fetch.from}|${dates.fetch.to}`, (api) => api.appointments.list(dates.fetch))
  const capacity = useAdminQuery(`capacity|${today}`, (api) => api.schedule.capacity(today))
  const waitlist = useAdminQuery(`waitlist|${today}`, (api) => api.waitlist.list({ from: today, to: dayKey(addDays(now, 61)) }))

  const list = appointments.data ?? []
  const week = summarize(list, now, dates.weekRange)
  const month = summarize(list, now, dates.monthRange)
  const nextWeek = week.upcoming.filter((a) => new Date(a.startsAt) < addDays(now, 7))
  const occupied = capacity.data ? occupancy(capacity.data) : null
  const dash = (value: string | number) => (appointments.data ? String(value) : '—')

  const kpis: Kpi[] = [
    { label: 'תורים היום', value: dash(week.today.length), icon: CalendarCheck2, emphasis: true, detail: fullDate(now) },
    { label: 'קרובים', value: dash(nextWeek.length), icon: CalendarClock, detail: 'בשבעת הימים הבאים' },
    { label: 'הושלמו', value: dash(week.completed), icon: CircleCheck, detail: 'השבוע' },
    { label: 'בוטלו', value: dash(week.cancelled), icon: XCircle, detail: week.noShows ? `השבוע · ${week.noShows} לא הגיעו` : 'השבוע' },
    { label: 'ממתינים', value: waitlist.data ? String(waitlist.data.length) : '—', icon: Hourglass, detail: 'ברשימות המתנה' },
    { label: 'זמנים פנויים היום', value: capacity.data ? String(freeSlots(capacity.data)) : '—', icon: Timer, detail: 'משבצות פנויות' },
    { label: 'הכנסות החודש', value: appointments.data ? formatPrice(month.revenue) : '—', icon: Coins, detail: 'הערכה לפי תורים שהושלמו' },
    { label: 'תפוסה היום', value: occupied === null ? '—' : `${Math.round(occupied * 100)}%`, icon: Gauge, detail: 'מהזמן הזמין להזמנה' },
  ]

  return (
    <div>
      <PageHeader title={`שלום, ${staff.name}`} subtitle={staff.role === 'owner' ? 'סקירת העסק' : 'הכיסא שלך'} />
      <QuickActions today={today} />
      <div className="mt-5 lg:mt-6">
        <KpiTiles items={kpis} />
      </div>
      <div className="mt-5 grid gap-5 lg:mt-6 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <TodaySchedule appointments={week.today} loading={!appointments.data} />
        <WeekChart days={perDay(list, dates.week)} today={today} />
      </div>
    </div>
  )
}
