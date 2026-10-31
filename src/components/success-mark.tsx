import { m } from 'motion/react'

import { springBouncy } from '@/lib/motion'

/** Confirmation emblem: an ink disc that springs in while a brass check draws itself. */
export function SuccessMark() {
  return (
    <div className="relative">
      <m.span
        aria-hidden
        className="absolute inset-0 rounded-full border border-brass"
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 1.7, opacity: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
      />
      <m.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springBouncy}
        className="surface-ink relative grid size-24 place-items-center rounded-full"
      >
        <svg viewBox="0 0 24 24" className="size-11 text-brass" fill="none" aria-hidden>
          <m.path
            d="M5.5 12.5l4 4L18.5 7.5"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 0.8, 0.24, 1] }}
          />
        </svg>
      </m.div>
    </div>
  )
}
