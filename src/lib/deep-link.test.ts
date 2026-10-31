import { describe, expect, it } from 'vitest'

import { parseDeepLink } from './deep-link'

const id = '11111111-1111-4111-8111-111111111111'

describe('parseDeepLink', () => {
  it('understands the links notifications carry', () => {
    expect(parseDeepLink('?go=notifications')).toEqual({ kind: 'notifications' })
    expect(parseDeepLink(`?go=appointment&id=${id}`)).toEqual({ kind: 'appointment', id })
    expect(parseDeepLink(`?go=book&service=${id}&barber=${id}&date=2026-11-10`)).toEqual({ kind: 'book', serviceId: id, barberId: id, date: '2026-11-10' })
  })

  it('ignores anything malformed or unknown', () => {
    expect(parseDeepLink('')).toBeNull()
    expect(parseDeepLink('?go=appointment&id=<script>')).toBeNull()
    expect(parseDeepLink(`?go=book&service=${id}&barber=${id}&date=tomorrow`)).toBeNull()
    expect(parseDeepLink('?go=elsewhere')).toBeNull()
  })
})
