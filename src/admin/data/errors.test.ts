import { describe, expect, it } from 'vitest'

import { AdminError, toAdminError } from './errors'

describe('toAdminError', () => {
  it('keeps backend codes raised by the database functions', () => {
    expect(toAdminError({ message: 'slot_unavailable' }).code).toBe('slot_unavailable')
    expect(toAdminError(new AdminError('forbidden')).code).toBe('forbidden')
  })

  it('explains the sign-in failures an owner can actually hit', () => {
    expect(toAdminError(new Error('Invalid login credentials')).code).toBe('invalid_credentials')
    expect(toAdminError(new Error('Email not confirmed')).code).toBe('email_not_confirmed')
  })

  it('recognises a failed request in every browser', () => {
    for (const message of ['Failed to fetch', 'fetch failed', 'NetworkError when attempting to fetch resource.', 'Load failed']) {
      expect(toAdminError(new TypeError(message)).code).toBe('network')
    }
  })

  it('reports permission errors as forbidden and anything else as unknown', () => {
    expect(toAdminError({ message: 'permission denied for table customers' }).code).toBe('forbidden')
    expect(toAdminError({ message: 'new row violates row-level security policy' }).code).toBe('forbidden')
    expect(toAdminError(new Error('something odd')).code).toBe('unknown')
  })
})
