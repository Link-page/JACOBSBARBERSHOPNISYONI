/**
 * In-app links carried by notifications ('?go=…', see supabase/migrations).
 * Only these shapes are understood; anything else is ignored.
 */
export type DeepLink =
  | { kind: 'notifications' }
  | { kind: 'appointment'; id: string }
  | { kind: 'book'; serviceId: string; barberId: string; date: string }

const uuid = /^[0-9a-f-]{36}$/i
const day = /^\d{4}-\d{2}-\d{2}$/

export function parseDeepLink(search: string): DeepLink | null {
  const params = new URLSearchParams(search)
  switch (params.get('go')) {
    case 'notifications':
      return { kind: 'notifications' }
    case 'appointment': {
      const id = params.get('id') ?? ''
      return uuid.test(id) ? { kind: 'appointment', id } : null
    }
    case 'book': {
      const [serviceId, barberId, date] = [params.get('service') ?? '', params.get('barber') ?? '', params.get('date') ?? '']
      return uuid.test(serviceId) && uuid.test(barberId) && day.test(date) ? { kind: 'book', serviceId, barberId, date } : null
    }
    default:
      return null
  }
}
