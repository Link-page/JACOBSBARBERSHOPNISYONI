import { describe, expect, it } from 'vitest'

import { classifySupabaseKey, isBrowserSafeKey, isValidSupabaseUrl } from './supabase-key'

/** A fake, unsigned JWT with the given role — test data, not a real key. */
const fakeJwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.signature`

describe('Supabase key policy', () => {
  it('accepts publishable and legacy anon keys', () => {
    expect(classifySupabaseKey('sb_publishable_abc123')).toBe('publishable')
    expect(classifySupabaseKey(fakeJwt('anon'))).toBe('legacy-anon')
    expect(isBrowserSafeKey('publishable')).toBe(true)
  })

  it('flags secret and service-role keys', () => {
    expect(classifySupabaseKey('sb_secret_abc123')).toBe('secret')
    expect(classifySupabaseKey(fakeJwt('service_role'))).toBe('secret')
    expect(isBrowserSafeKey('secret')).toBe(false)
  })

  it('rejects anything else', () => {
    expect(classifySupabaseKey('')).toBe('invalid')
    expect(classifySupabaseKey('not-a-key')).toBe('invalid')
    expect(classifySupabaseKey(fakeJwt('authenticated'))).toBe('invalid')
  })

  it('validates project URLs', () => {
    expect(isValidSupabaseUrl('https://abcdefgh.supabase.co')).toBe(true)
    expect(isValidSupabaseUrl('https://abcdefgh.supabase.co/')).toBe(true)
    expect(isValidSupabaseUrl('http://abcdefgh.supabase.co')).toBe(false)
    expect(isValidSupabaseUrl('https://abcdefgh.supabase.co/rest/v1')).toBe(false)
    expect(isValidSupabaseUrl('not a url')).toBe(false)
  })
})
