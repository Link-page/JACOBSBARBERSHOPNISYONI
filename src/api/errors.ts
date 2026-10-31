/** Reasons the booking backend refuses a request, and what to tell the customer. */
const messages: Record<string, string> = {
  slot_unavailable: 'השעה הזו כבר נתפסה. בחרו שעה אחרת.',
  booking_limit: 'יש לכם כבר את מספר התורים המרבי. בטלו תור קיים כדי לקבוע חדש.',
  waitlist_limit: 'אתם כבר רשומים למספר המרבי של רשימות המתנה.',
  too_late_to_change: 'כבר מאוחר מדי לשנות את התור הזה. התקשרו למספרה.',
  slots_available: 'נפתחו שעות פנויות ביום הזה. אפשר לקבוע תור רגיל.',
  invalid_status: 'אי אפשר לשנות תור במצב הזה.',
  not_authenticated: 'צריך להתחבר מחדש.',
  network: 'אין חיבור לשרת. בדקו את החיבור ונסו שוב.',
}

export class BookingError extends Error {
  readonly code: string
  constructor(code: string) {
    super(messages[code] ?? 'משהו השתבש. נסו שוב.')
    this.code = code
  }
}

/** Database functions raise their reason as the message (see supabase/migrations). */
export function toBookingError(error: unknown): BookingError {
  if (error instanceof BookingError) return error
  const text = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)
  const code = Object.keys(messages).find((key) => text.includes(key))
  if (code) return new BookingError(code)
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(text)) return new BookingError('network')
  if (/jwt|not_authenticated|28000/i.test(text)) return new BookingError('not_authenticated')
  return new BookingError('unknown')
}
