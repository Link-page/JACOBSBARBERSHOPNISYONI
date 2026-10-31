import { type MouseEvent } from 'react'

import { useNow } from '@/hooks/use-now'
import { dayKey, fromMinutes } from '@/lib/date'
import { cn } from '@/lib/utils'

import type { Appointment, TimeBlock } from '../../data/types'
import { AppointmentChip } from './appointment-chip'

export type GridColumn = { key: string; label: string; date: string; barberId: string | null; highlight?: boolean }

type TimeGridProps = {
  columns: GridColumn[]
  appointments: Appointment[]
  blocks: TimeBlock[]
  /** Visible hours in minutes from midnight. */
  range: { start: number; end: number }
  onEmptyClick: (date: string, time: string, barberId: string | null) => void
  onAppointmentClick: (appointment: Appointment) => void
}

const PX_PER_MINUTE = 1.1
const minutesOf = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** Desktop day/week grid: hours down the side, one column per barber or day. */
export function TimeGrid({ columns, appointments, blocks, range, onEmptyClick, onAppointmentClick }: TimeGridProps) {
  const now = useNow(60_000)
  const height = (range.end - range.start) * PX_PER_MINUTE
  const hours = Array.from({ length: Math.ceil((range.end - range.start) / 60) }, (_, i) => range.start + i * 60)
  const place = (startIso: string, endIso: string) => {
    const top = Math.max(0, (minutesOf(startIso) - range.start) * PX_PER_MINUTE)
    const bottom = Math.min(height, (minutesOf(endIso) - range.start) * PX_PER_MINUTE || height)
    return { top, height: Math.max(18, bottom - top - 2) }
  }

  const clickColumn = (column: GridColumn) => (event: MouseEvent<HTMLDivElement>) => {
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top
    const minutes = range.start + Math.floor(y / PX_PER_MINUTE / 15) * 15
    onEmptyClick(column.date, fromMinutes(minutes), column.barberId)
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-card shadow-elevation">
      <div className="grid border-b" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))` }}>
        <span />
        {columns.map((c) => (
          <div key={c.key} className={cn('border-s px-2 py-3 text-center text-subhead font-medium', c.highlight && 'text-brass')}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="max-h-[68dvh] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))`, height }}>
          <div className="relative">
            {hours.map((h) => (
              <span key={h} className="absolute end-2 -translate-y-1/2 text-caption text-muted-foreground tabular" style={{ top: (h - range.start) * PX_PER_MINUTE }}>
                {h > range.start && fromMinutes(h)}
              </span>
            ))}
          </div>
          {columns.map((column) => (
            <div key={column.key} role="presentation" className="relative cursor-copy border-s" onClick={clickColumn(column)}>
              {hours.map((h) => (
                <span key={h} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ top: (h - range.start) * PX_PER_MINUTE }} />
              ))}
              {blocks
                .filter((b) => (b.barberId === null || column.barberId === null || b.barberId === column.barberId) && dayKey(new Date(b.startsAt)) <= column.date && dayKey(new Date(new Date(b.endsAt).getTime() - 1)) >= column.date)
                .map((b) => {
                  const sameDayStart = dayKey(new Date(b.startsAt)) === column.date
                  const sameDayEnd = dayKey(new Date(b.endsAt)) === column.date
                  const pos = place(sameDayStart ? b.startsAt : `${column.date}T00:00:00`, sameDayEnd ? b.endsAt : `${column.date}T23:59:00`)
                  return (
                    <div
                      key={b.id}
                      title={b.reason || 'זמן חסום'}
                      className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,transparent_6px_12px)]"
                      style={pos}
                    >
                      <span className="m-1 inline-block rounded-full bg-card px-2 text-caption2 text-muted-foreground">{b.reason || 'חסום'}</span>
                    </div>
                  )
                })}
              {appointments
                .filter((a) => dayKey(new Date(a.startsAt)) === column.date && (column.barberId === null || a.barberId === column.barberId))
                .map((a) => (
                  <AppointmentChip key={a.id} appointment={a} style={place(a.startsAt, a.endsAt)} onClick={() => onAppointmentClick(a)} />
                ))}
              {dayKey(now) === column.date && minutesOf(now.toISOString()) >= range.start && minutesOf(now.toISOString()) <= range.end && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-brass" style={{ top: (minutesOf(now.toISOString()) - range.start) * PX_PER_MINUTE }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
