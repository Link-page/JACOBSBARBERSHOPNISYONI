import { normalizeIlMobile } from '@/lib/phone'

import type { ProfileInput, SignUpInput } from './types'

/** Field → message. Empty when the form can be sent. The server checks everything again. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>

export const MIN_PASSWORD = 8

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateProfile({ fullName, phone }: ProfileInput): FieldErrors<ProfileInput> {
  const errors: FieldErrors<ProfileInput> = {}
  const name = fullName.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 80) errors.fullName = 'נא להזין שם מלא.'
  if (!normalizeIlMobile(phone)) errors.phone = 'נא להזין מספר נייד ישראלי, למשל 050-1234567.'
  return errors
}

export function validateSignIn({ email, password }: { email: string; password: string }) {
  const errors: FieldErrors<{ email: string; password: string }> = {}
  if (!emailPattern.test(email.trim())) errors.email = 'נא להזין כתובת אימייל תקינה.'
  if (!password) errors.password = 'נא להזין סיסמה.'
  return errors
}

export function validateSignUp(input: SignUpInput): FieldErrors<SignUpInput> {
  const errors: FieldErrors<SignUpInput> = { ...validateProfile(input) }
  if (!emailPattern.test(input.email.trim())) errors.email = 'נא להזין כתובת אימייל תקינה.'
  if (input.password.length < MIN_PASSWORD) errors.password = `לפחות ${MIN_PASSWORD} תווים.`
  return errors
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0

/** What is sent to the server: trimmed name, canonical phone. */
export const cleanProfile = ({ fullName, phone }: ProfileInput): ProfileInput => ({
  fullName: fullName.trim().replace(/\s+/g, ' '),
  phone: normalizeIlMobile(phone) ?? phone,
})
