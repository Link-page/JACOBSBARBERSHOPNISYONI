import { describe, expect, it } from 'vitest'

import { NEIGHBOUR_SCALE, defaultCardWidth, keyTarget, settleIndex, slideRole, slideStep } from './carousel-math'

describe('carousel geometry', () => {
  it('spaces scaled neighbours exactly `gap` from the centre card', () => {
    const width = 300
    const step = slideStep(width, 16)
    const centreEdge = width / 2
    const neighbourEdge = step - (width * NEIGHBOUR_SCALE) / 2
    expect(neighbourEdge - centreEdge).toBeCloseTo(16)
  })

  it('gives phones one dominant card and desktops a capped width', () => {
    expect(defaultCardWidth(390)).toBe(273)
    expect(defaultCardWidth(1440)).toBe(400)
  })

  it('classifies cards around the active one', () => {
    expect([0, 1, 2, 3].map((i) => slideRole(i, 1))).toEqual(['near', 'active', 'near', 'far'])
  })
})

describe('carousel input', () => {
  it('settles a drag on the nearest card, and a flick on the next one', () => {
    expect(settleIndex(2, 40, 0, 280, 6)).toBe(2) // short, slow: snaps back
    expect(settleIndex(2, 200, 0, 280, 6)).toBe(3) // past half a card
    expect(settleIndex(2, 30, 900, 280, 6)).toBe(3) // flick
    expect(settleIndex(2, -30, -900, 280, 6)).toBe(1)
    expect(settleIndex(5, 600, 2000, 280, 6)).toBe(5) // never past the end
  })

  it('mirrors arrow keys for right-to-left', () => {
    expect(keyTarget('ArrowLeft', 1, 4, true)).toBe(2)
    expect(keyTarget('ArrowRight', 1, 4, true)).toBe(0)
    expect(keyTarget('ArrowRight', 1, 4, false)).toBe(2)
    expect(keyTarget('End', 0, 4, true)).toBe(3)
    expect(keyTarget('Enter', 0, 4, true)).toBeNull()
  })
})
