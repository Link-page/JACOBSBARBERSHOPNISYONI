import { m } from 'motion/react'
import type { ReactNode } from 'react'

import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: ReactNode }

export function SegmentedControl<T extends string>({
  id,
  value,
  onChange,
  options,
  className,
}: {
  /** Unique per control — scopes the sliding thumb's shared layout id. */
  id: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex rounded-full bg-muted p-[3px]', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className="relative h-[34px] flex-1 rounded-full text-footnote font-semibold"
          >
            {active && (
              <m.span
                layoutId={`segment-${id}`}
                transition={springSnappy}
                className="absolute inset-0 rounded-full bg-[var(--segment-thumb)] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
              />
            )}
            <span className={cn('relative transition-opacity duration-200', !active && 'opacity-75')}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
