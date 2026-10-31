import type { ReactNode } from 'react'

/** The pinned bottom bar of the sheet: an optional summary line above the step's actions. */
export function BookingActionBar({ summary, price, children }: { summary?: string; price?: string; children: ReactNode }) {
  return (
    <div className="glass-bar px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[inset_0_0.5px_0_0_var(--border)]">
      {summary && (
        <div className="mb-3 flex items-center justify-between gap-3 text-subhead">
          <span className="truncate text-muted-foreground">{summary}</span>
          {price && <span className="shrink-0 font-semibold tabular">{price}</span>}
        </div>
      )}
      {children}
    </div>
  )
}
