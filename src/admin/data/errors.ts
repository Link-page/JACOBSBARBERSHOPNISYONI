/** Error codes raised by the backend (see the SQL functions) and their Hebrew messages. */
const messages: Record<string, string> = {
  slot_unavailable: 'השעה כבר לא פנויה. בחרו שעה אחרת.',
  forbidden: 'אין לך הרשאה לפעולה הזו.',
  too_late_to_change: 'עבר המועד לשינוי התור הזה.',
  invalid_status: 'אי אפשר לבצע את הפעולה במצב הנוכחי.',
  service_not_offered: 'הספר לא מבצע את הטיפול הזה.',
  customer_details_required: 'נדרש שם לקוח.',
  customer_not_found: 'הלקוח לא נמצא.',
  not_found: 'הרשומה לא נמצאה.',
  offer_expired: 'ההצעה כבר לא בתוקף.',
  user_not_found: 'לא נמצא חשבון עם האימייל הזה. המשתמש צריך להירשם קודם.',
  last_owner: 'אי אפשר להסיר את הבעלים האחרון.',
  slots_available: 'יש עדיין תורים פנויים ביום הזה.',
  day_closed: 'המספרה סגורה ביום הזה.',
  invalid_credentials: 'אימייל או סיסמה שגויים.',
  email_not_confirmed: 'כתובת האימייל של החשבון עוד לא אומתה. לחצו על הקישור במייל האימות ונסו שוב.',
  network: 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.',
  not_configured: 'השרת עדיין לא הוגדר.',
}

export class AdminError extends Error {
  readonly code: string
  constructor(code: string) {
    super(messages[code] ?? 'משהו השתבש. נסו שוב.')
    this.code = code
  }
}

/** Normalises any thrown value (Postgres/Supabase errors included) to an AdminError. */
export function toAdminError(error: unknown): AdminError {
  if (error instanceof AdminError) return error
  const text = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  const code = Object.keys(messages).find((key) => text === key || text.includes(key))
  if (code) return new AdminError(code)
  if (/invalid login credentials/i.test(text)) return new AdminError('invalid_credentials')
  if (/email not confirmed/i.test(text)) return new AdminError('email_not_confirmed')
  // Chrome, Node, Firefox and Safari word a failed request differently.
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(text)) return new AdminError('network')
  if (/permission denied|row-level security/i.test(text)) return new AdminError('forbidden')
  return new AdminError('unknown')
}
