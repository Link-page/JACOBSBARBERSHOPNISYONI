import { describe, expect, it } from 'vitest'

import { toAccountError } from './errors'
import { cleanProfile, hasErrors, validateSignIn, validateSignUp } from './validation'

const valid = { fullName: 'דניאל כהן', phone: '054-123-4567', email: 'dan@example.com', password: 'a-long-pass' }

describe('account forms', () => {
  it('accepts a complete sign-up', () => {
    expect(hasErrors(validateSignUp(valid))).toBe(false)
  })

  it('flags each invalid field', () => {
    const errors = validateSignUp({ fullName: 'ד', phone: '03-1234567', email: 'dan@', password: 'short' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password', 'phone'])
    expect(Object.keys(validateSignIn({ email: '', password: '' })).sort()).toEqual(['email', 'password'])
  })

  it('sends a trimmed name and a canonical phone', () => {
    expect(cleanProfile({ fullName: '  דניאל   כהן ', phone: '+972 54 123 4567' })).toEqual({ fullName: 'דניאל כהן', phone: '0541234567' })
  })
})

describe('toAccountError', () => {
  it('maps Supabase Auth codes, database reasons and network failures', () => {
    expect(toAccountError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).code).toBe('invalid_credentials')
    expect(toAccountError({ code: 'signup_disabled', message: 'Signups not allowed for this instance' }).code).toBe('signup_disabled')
    expect(toAccountError({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }).code).toBe('rate_limited')
    expect(toAccountError({ message: 'phone_in_use' }).code).toBe('phone_in_use')
    expect(toAccountError(new TypeError('Failed to fetch')).code).toBe('network')
  })
})
