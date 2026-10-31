import { AnimatePresence, m } from 'motion/react'

import { springBouncy } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** JACOB'S selection indicator: a hairline ring that fills with a brass core. */
export function SelectionRing({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200',
        selected ? 'border-brass' : 'border-tertiary',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={springBouncy}
            className="size-[10px] rounded-full bg-brass"
          />
        )}
      </AnimatePresence>
    </span>
  )
}
