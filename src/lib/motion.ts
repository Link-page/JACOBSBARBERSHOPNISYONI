import type { Transition } from 'motion/react'

/** Snappy, critically-damped — selection thumbs, tab lens. */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 }

/** Default UI spring with a whisper of bounce — sheets, cards, steps. */
export const spring: Transition = { type: 'spring', bounce: 0.18, duration: 0.5 }

/** Expressive — confirmations and moments of delight. */
export const springBouncy: Transition = { type: 'spring', bounce: 0.38, duration: 0.65 }
