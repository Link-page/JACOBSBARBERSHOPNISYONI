import { describe, expect, it } from 'vitest'

import { shiftDate, visibleDays } from './calendar-range'

describe('calendar ranges', () => {
  it('weeks run Sunday to Saturday', () => {
    expect(visibleDays('week', '2030-01-08')).toEqual(['2030-01-06', '2030-01-07', '2030-01-08', '2030-01-09', '2030-01-10', '2030-01-11', '2030-01-12'])
  })

  it('months cover whole weeks', () => {
    const days = visibleDays('month', '2030-01-15')
    expect(days[0]).toBe('2029-12-30')
    expect(days.at(-1)).toBe('2030-02-02')
    expect(days.length % 7).toBe(0)
  })

  it('shifts by the view length', () => {
    expect(shiftDate('day', '2030-01-31', 1)).toBe('2030-02-01')
    expect(shiftDate('week', '2030-01-08', -1)).toBe('2030-01-01')
    expect(shiftDate('month', '2030-01-31', 1)).toBe('2030-02-01')
  })
})
