import { monthShort } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Calendar-icon style date: short month over the day number. */
export function DateTile({ date, className, muted }: { date: Date; className?: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[52px] shrink-0 flex-col items-center justify-center rounded-[15px] bg-muted',
        muted && 'opacity-60',
        className,
      )}
    >
      <span className="text-caption2 font-bold tracking-[0.08em] text-muted-foreground uppercase">{monthShort(date)}</span>
      <span className="text-title3 leading-none font-semibold tabular">{date.getDate()}</span>
    </span>
  )
}
