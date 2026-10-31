import { monthShort } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Serif day number over a brass month abbreviation. */
export function DateTile({ date, className, muted }: { date: Date; className?: string; muted?: boolean }) {
  return (
    <span className={cn('flex w-11 shrink-0 flex-col items-center leading-none', muted && 'opacity-50', className)}>
      <span className="font-display text-[28px] font-medium tabular">{date.getDate()}</span>
      <span className="mt-1 text-caption font-medium text-brass">{monthShort(date)}</span>
    </span>
  )
}
