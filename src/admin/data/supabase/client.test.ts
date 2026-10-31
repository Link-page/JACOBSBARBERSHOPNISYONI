import { describe, expect, it } from 'vitest'

import { AdminError } from '../errors'
import { changedRows, unwrap } from './client'

describe('Supabase result helpers', () => {
  it('unwrap returns data and translates errors', () => {
    expect(unwrap({ data: [1], error: null })).toEqual([1])
    expect(() => unwrap({ data: null, error: { message: 'permission denied for table customers' } })).toThrow(
      expect.objectContaining({ code: 'forbidden' }),
    )
    expect(() => unwrap({ data: null, error: { message: 'slot_unavailable' } })).toThrow(
      expect.objectContaining({ code: 'slot_unavailable' }),
    )
  })

  it('changedRows reports a write filtered out by Row Level Security as forbidden', () => {
    expect(changedRows({ data: [{ id: 'a' }], error: null })).toEqual([{ id: 'a' }])
    for (const data of [[], null]) {
      let thrown: unknown
      try {
        changedRows({ data, error: null })
      } catch (error) {
        thrown = error
      }
      expect(thrown).toBeInstanceOf(AdminError)
      expect(thrown).toMatchObject({ code: 'forbidden' })
    }
  })
})
