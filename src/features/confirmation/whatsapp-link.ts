/** Israeli numbers in any local format → international digits for wa.me (e.g. 0541234567 → 972541234567). */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return '972' + digits.slice(1)
  return digits
}

/**
 * A WhatsApp chat with the barber (or the shop) prefilled with a polite request
 * to cancel. Opening it cancels nothing — only the shop can, after reading it.
 */
export function cancellationRequestLink(phone: string, d: { customerName: string; when: string; service: string; barber: string }): string | null {
  const number = toWhatsAppNumber(phone)
  if (!number) return null
  const text = `שלום, כאן ${d.customerName}. אבקש לבטל את התור שלי ${d.when} — ${d.service} אצל ${d.barber}. תודה!`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}
