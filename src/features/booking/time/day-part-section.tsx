import type { ReactNode } from 'react'

import type { DayPartId } from '@/booking/day-parts'

const labels: Record<DayPartId, string> = { morning: 'בוקר', afternoon: 'צהריים', evening: 'ערב' }

/** A titled group of time rows; the title stays pinned while its rows scroll. */
export function DayPartSection({ part, count, children }: { part: DayPartId; count: number; children: ReactNode }) {
  return (
    <section aria-label={labels[part]}>
      <div className="sticky top-0 z-10 -mx-5 flex items-baseline justify-between bg-background/90 px-6 pt-3 pb-2.5 backdrop-blur-md">
        <h3 className="font-display text-title3 font-medium">{labels[part]}</h3>
        <span className="text-footnote text-muted-foreground tabular">{count === 1 ? 'פנוי אחד' : `${count} פנויים`}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
