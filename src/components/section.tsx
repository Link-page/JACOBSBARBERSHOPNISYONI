import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionProps = {
  title: string
  /** Makes the title a navigation link, Apple Music style ("Title ›"). */
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
          <button type="button" onClick={onTitleClick} className="pressable -ml-0.5 flex items-center gap-0.5 px-0.5">
            <h2 className="text-title2 font-bold">{title}</h2>
            <ChevronRight className="mt-0.5 size-5 text-tertiary" strokeWidth={2.75} />
          </button>
        ) : (
          <h2 className="text-title2 font-bold">{title}</h2>
        )}
        {action}
      </div>
      {children}
    </section>
  )
}
