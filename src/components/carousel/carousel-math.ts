/** Pure geometry and input rules for the centre-focused carousel. */

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Scale of the cards beside the centre one. */
export const NEIGHBOUR_SCALE = 0.86

/** Distance between card centres, so scaled neighbours sit `gap` px from the centre card. */
export const slideStep = (cardWidth: number, gap: number) => (cardWidth * (1 + NEIGHBOUR_SCALE)) / 2 + gap

/** Card width for the space available: one dominant card on phones, more breathing room on wide screens. */
export function defaultCardWidth(containerWidth: number) {
  if (containerWidth < 640) return Math.round(containerWidth * 0.7)
  if (containerWidth < 1024) return Math.round(containerWidth * 0.42)
  return Math.round(Math.min(400, containerWidth * 0.3))
}

/**
 * Where a drag settles. `forward` is the distance dragged towards the next card
 * (px) and `velocity` its speed (px/s, same sign). A quick flick always moves one card.
 */
export function settleIndex(current: number, forward: number, velocity: number, step: number, count: number) {
  let moved = Math.round((forward + velocity * 0.15) / step)
  if (moved === 0 && Math.abs(velocity) > 400) moved = Math.sign(velocity)
  return clamp(current + moved, 0, count - 1)
}

export type SlideRole = 'active' | 'near' | 'far'

export const slideRole = (index: number, active: number): SlideRole =>
  index === active ? 'active' : Math.abs(index - active) === 1 ? 'near' : 'far'

/** Arrow keys follow the reading direction: in Hebrew ← goes to the next card. */
export function keyTarget(key: string, active: number, count: number, rtl: boolean): number | null {
  if (key === (rtl ? 'ArrowLeft' : 'ArrowRight')) return clamp(active + 1, 0, count - 1)
  if (key === (rtl ? 'ArrowRight' : 'ArrowLeft')) return clamp(active - 1, 0, count - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}
