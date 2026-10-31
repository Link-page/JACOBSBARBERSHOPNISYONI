import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionProps = {
  title: string
  /** Makes the title a link to the full view. */
  onTitleClick?: () => void
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function Section({ title, onTitleClick, action, className, children }: SectionProps) {
  return (
    <section className={cn('mt-10', className)}>
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        {onTitleClick ? (
          <button type="button" onClick={onTitleClick} className="pressable -ms-0.5 flex items-center gap-1 px-0.5">
            <h2 className="font-display text-title2 font-medium">{title}</h2>
            <ChevronRight className="mt-1 size-5 text-brass rtl:-scale-x-100" strokeWidth={2.2} />
          </button>
        ) : (
          <h2 className="font-display text-title2 font-medium">{title}</h2>
        )}
        {action}
      </div>
      {children}
    </section>
  )
}
