/** Why sign-in, sign-up or profile completion failed, in the customer's language. */
const messages: Record<string, string> = {
  invalid_credentials: 'אימייל או סיסמה שגויים.',
  email_not_confirmed: 'עוד לא אישרתם את כתובת האימייל. לחצו על הקישור ששלחנו אליכם.',
  signup_disabled: 'ההרשמה עדיין לא פתוחה. נסו שוב בקרוב.',
  already_registered: 'כבר קיים חשבון עם האימייל הזה. נסו להתחבר.',
  weak_password: 'הסיסמה חלשה מדי. בחרו לפחות 8 תווים.',
  rate_limited: 'היו יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.',
  invalid_name: 'נא להזין שם מלא.',
  invalid_phone: 'נא להזין מספר נייד ישראלי, למשל 050-1234567.',
  phone_in_use: 'המספר הזה כבר משויך לחשבון אחר. אם הוא שלכם, פנו למספרה.',
  network: 'אין חיבור לשרת. בדקו את החיבור ונסו שוב.',
}

export class AccountError extends Error {
  readonly code: string
  constructor(code: string) {
    super(messages[code] ?? 'משהו השתבש. נסו שוב.')
    this.code = code
  }
}

/** Supabase Auth error codes → ours. */
const authCodes: Record<string, string> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  signup_disabled: 'signup_disabled',
  email_provider_disabled: 'signup_disabled',
  user_already_exists: 'already_registered',
  email_exists: 'already_registered',
  weak_password: 'weak_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
}

export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error
  const record = (typeof error === 'object' && error ? error : {}) as { code?: string; message?: string }
  const text = record.message ?? String(error)
  if (record.code && authCodes[record.code]) return new AccountError(authCodes[record.code])
  // Database functions (register_customer) raise their reason as the message.
  const own = Object.keys(messages).find((key) => text.includes(key))
  if (own) return new AccountError(own)
  if (/invalid login credentials/i.test(text)) return new AccountError('invalid_credentials')
  if (/email not confirmed/i.test(text)) return new AccountError('email_not_confirmed')
  if (/signups? not allowed/i.test(text)) return new AccountError('signup_disabled')
  if (/already registered/i.test(text)) return new AccountError('already_registered')
  if (/rate limit/i.test(text)) return new AccountError('rate_limited')
  if (/password/i.test(text)) return new AccountError('weak_password')
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(text)) return new AccountError('network')
  return new AccountError('unknown')
}
