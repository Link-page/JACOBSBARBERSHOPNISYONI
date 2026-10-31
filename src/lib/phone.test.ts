import { describe, expect, it } from 'vitest'

import { formatIlMobile, normalizeIlMobile } from './phone'

describe('Israeli mobile numbers', () => {
  it('normalises the formats people type (same cases as the database test)', () => {
    expect(normalizeIlMobile('054-123-4567')).toBe('0541234567')
    expect(normalizeIlMobile('+972 54 123 4567')).toBe('0541234567')
    expect(normalizeIlMobile('972541234567')).toBe('0541234567')
    expect(normalizeIlMobile('(050) 000 1111')).toBe('0500001111')
    expect(normalizeIlMobile('03-123-4567')).toBeNull()
    expect(normalizeIlMobile('054-123')).toBeNull()
    expect(normalizeIlMobile('not a phone')).toBeNull()
  })

  it('formats for display', () => {
    expect(formatIlMobile('0541234567')).toBe('054-123-4567')
  })
})
