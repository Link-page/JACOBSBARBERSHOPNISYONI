import { describe, expect, it } from 'vitest'

import { timeAgo } from './format'

describe('timeAgo', () => {
  const now = new Date('2026-11-09T12:00:00Z')
  it('speaks in minutes, hours, then dates', () => {
    expect(timeAgo('2026-11-09T11:59:40Z', now)).toBe('עכשיו')
    expect(timeAgo('2026-11-09T11:55:00Z', now)).toBe('לפני 5 דק׳')
    expect(timeAgo('2026-11-09T11:00:00Z', now)).toBe('לפני שעה')
    expect(timeAgo('2026-11-09T10:00:00Z', now)).toBe('לפני שעתיים')
    expect(timeAgo('2026-11-09T07:00:00Z', now)).toBe('לפני 5 שעות')
    expect(timeAgo('2026-11-08T10:00:00Z', now)).toBe('אתמול')
  })
})
