import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'

import { fromMonthKey } from '@/lib/date'
import { monthName } from '@/lib/format'
import { cn } from '@/lib/utils'

type MonthHeaderProps = {
  month: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}

/** Month and year, flanked by previous / next controls (mirrored for RTL). */
export function MonthHeader({ month, canPrev, canNext, onPrev, onNext }: MonthHeaderProps) {
  const date = fromMonthKey(month)
  return (
    <div className="flex items-center justify-between px-1 pb-4">
      <NavButton label="החודש הקודם" disabled={!canPrev} onClick={onPrev}>
        <ChevronLeft className="size-[18px] rtl:-scale-x-100" strokeWidth={2.4} />
      </NavButton>
      <div className="relative h-8 flex-1 overflow-hidden text-center" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          <m.h3
            key={month}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }}
            className="flex items-baseline justify-center gap-2"
          >
            <span className="font-display text-title2 font-medium">{monthName(date)}</span>
            <span className="text-subhead text-muted-foreground tabular">{date.getFullYear()}</span>
          </m.h3>
        </AnimatePresence>
      </div>
      <NavButton label="החודש הבא" disabled={!canNext} onClick={onNext}>
        <ChevronRight className="size-[18px] rtl:-scale-x-100" strokeWidth={2.4} />
      </NavButton>
    </div>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'pressable grid size-9 place-items-center rounded-full bg-muted text-foreground',
        'disabled:pointer-events-none disabled:opacity-30',
      )}
    >
      {children}
    </button>
  )
}
