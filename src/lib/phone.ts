/**
 * Israeli mobile numbers. Mirrors app.normalize_il_mobile (0010_customer_accounts.sql):
 * the database re-checks everything; this only gives instant feedback.
 */
export function normalizeIlMobile(input: string): string | null {
  const digits = input.replace(/[^0-9+]/g, '').replace(/^\+?972/, '0')
  return /^05\d{8}$/.test(digits) ? digits : null
}

/** '0541234567' → '054-123-4567' (display only). */
export function formatIlMobile(phone: string): string {
  const n = normalizeIlMobile(phone)
  return n ? `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}` : phone
}
