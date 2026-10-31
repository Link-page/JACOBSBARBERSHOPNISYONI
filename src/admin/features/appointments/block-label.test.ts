import { describe, expect, it } from 'vitest'

import { fromDayKey } from '@/lib/date'

import { blockTimeLabel } from './block-label'
import { toIso } from './time'

const day = (date: string) => fromDayKey(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

describe('blockTimeLabel', () => {
  it('shows the hours of a block within one day', () => {
    expect(blockTimeLabel({ startsAt: toIso('2026-11-04', '15:00'), endsAt: toIso('2026-11-04', '16:00') })).toBe(`${day('2026-11-04')} · 15:00–16:00`)
  })

  it('calls a midnight-to-midnight block "all day"', () => {
    expect(blockTimeLabel({ startsAt: toIso('2026-11-04', '00:00'), endsAt: toIso('2026-11-05', '00:00') })).toBe(`${day('2026-11-04')} · כל היום`)
  })

  it('names the first and last day of a multi-day closure', () => {
    expect(blockTimeLabel({ startsAt: toIso('2026-11-04', '00:00'), endsAt: toIso('2026-11-07', '00:00') })).toBe(`${day('2026-11-04')} – ${day('2026-11-06')}`)
  })

  it('shows both ends of a block that crosses midnight', () => {
    expect(blockTimeLabel({ startsAt: toIso('2026-11-04', '22:00'), endsAt: toIso('2026-11-05', '02:00') })).toBe(`${day('2026-11-04')} 22:00 – ${day('2026-11-05')} 02:00`)
  })
})
