import { AnimatePresence, m, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

import { inlineSign } from '@/lib/direction'
import { spring } from '@/lib/motion'

const variants: Variants = {
  enter: (offset: number) => ({ x: offset * 56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { x: spring, opacity: { duration: 0.2 } } },
  exit: (offset: number) => ({ x: offset * -56, opacity: 0, transition: { duration: 0.14 } }),
}

/**
 * Hosts one step at a time. Moving forward slides along the reading direction;
 * each step gets its own scroll container, so every screen opens at the top.
 */
export function StepStage({ stepKey, direction, children }: { stepKey: string; direction: number; children: ReactNode }) {
  const offset = direction * inlineSign()
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <AnimatePresence mode="wait" initial={false} custom={offset}>
        <m.div
          key={stepKey}
          custom={offset}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="scrollbar-none absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {children}
        </m.div>
      </AnimatePresence>
    </div>
  )
}
