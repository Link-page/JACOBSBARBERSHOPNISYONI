import { AnimatePresence, m, type PanInfo, type Variants } from 'motion/react'
import { useMemo, useRef, useState } from 'react'

import type { DayAvailability } from '@/api'
import { canGoToMonth, monthCells } from '@/booking/calendar'
import { Button } from '@/components/ui/button'
import { addMonths } from '@/lib/date'
import { inlineSign } from '@/lib/direction'
import { cn } from '@/lib/utils'

import { DayCell } from './day-cell'
import { MonthHeader } from './month-header'
import { WeekdayRow } from './weekday-row'

/** Horizontal distance (px) a swipe must travel to change month. */
const SWIPE_THRESHOLD = 56

const slide: Variants = {
  enter: (offset: number) => ({ x: offset * 44, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { x: { type: 'spring', bounce: 0.12, duration: 0.45 }, opacity: { duration: 0.2 } } },
  exit: (offset: number) => ({ x: offset * -44, opacity: 0, transition: { duration: 0.18 } }),
}

type MonthCalendarProps = {
  month: string
  range: { first: string; last: string }
  onMonthChange: (month: string) => void
  days?: DayAvailability[]
  loading: boolean
  error: unknown
  onRetry: () => void
  selected?: string
  today: string
  onSelect: (date: string) => void
  className?: string
}

/** A full month of days with availability, month navigation and swipe between months. */
export function MonthCalendar({
  month,
  range,
  onMonthChange,
  days,
  loading,
  error,
  onRetry,
  selected,
  today,
  onSelect,
  className,
}: MonthCalendarProps) {
  const [direction, setDirection] = useState(0)
  // A swipe ends with a pointer-up on some day; that must not count as tapping it.
  const swiping = useRef(false)
  const cells = useMemo(() => monthCells(month), [month])
  const byDate = useMemo(() => new Map(days?.map((d) => [d.date, d])), [days])

  const go = (delta: number) => {
    const target = addMonths(month, delta)
    if (!canGoToMonth(target, range)) return
    setDirection(delta)
    onMonthChange(target)
  }

  // Swiping toward the reading direction's end reveals the next month.
  const onSwipe = (_: unknown, info: PanInfo) => {
    const travel = info.offset.x * inlineSign()
    if (travel < -SWIPE_THRESHOLD) go(1)
    else if (travel > SWIPE_THRESHOLD) go(-1)
    requestAnimationFrame(() => (swiping.current = false))
  }

  const select = (date: string) => {
    if (!swiping.current) onSelect(date)
  }

  const offset = direction * inlineSign()

  return (
    <section aria-label="לוח שנה" className={cn('rounded-[28px] bg-card p-4 pb-3 shadow-elevation', className)}>
      <MonthHeader
        month={month}
        canPrev={canGoToMonth(addMonths(month, -1), range)}
        canNext={canGoToMonth(addMonths(month, 1), range)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
      <WeekdayRow />
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={offset}>
          <m.div
            key={month}
            custom={offset}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            dragDirectionLock
            onDragStart={() => (swiping.current = true)}
            onDragEnd={onSwipe}
            className="grid touch-pan-y grid-cols-7 gap-x-1 gap-y-1"
          >
            {cells.map((cell, i) =>
              cell ? (
                <DayCell
                  key={cell.key}
                  cell={cell}
                  availability={byDate.get(cell.key)}
                  selected={cell.key === selected}
                  isToday={cell.key === today}
                  loading={loading && !days}
                  onSelect={select}
                />
              ) : (
                <span key={`pad-${i}`} aria-hidden />
              ),
            )}
          </m.div>
        </AnimatePresence>
      </div>
      {!!error && !days && (
        <div role="alert" className="flex items-center justify-between gap-3 px-1 pt-3 text-footnote text-muted-foreground">
          לא הצלחנו לטעון את הזמינות.
          <Button size="sm" variant="secondary" onClick={onRetry}>
            ניסיון נוסף
          </Button>
        </div>
      )}
    </section>
  )
}
