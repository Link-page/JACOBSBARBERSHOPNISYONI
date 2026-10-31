import type { CatalogueValue } from './catalogue-context'
import type { Barber, Catalogue, Service } from './types'

/** Shown for an id the catalogue doesn't know (removed from the database). */
const unknownService = (id: string): Service => ({ id, name: 'טיפול', description: '', duration: 30, price: 0, active: false })
const unknownBarber = (id: string): Barber => ({ id, name: 'ספר', initial: 'ס', bio: '', photoUrl: null, serviceIds: [], active: false, whatsapp: '' })

/** Lookups and the active lists the screens use. */
export function catalogueValue({ services, barbers, gallery, contact }: Catalogue): CatalogueValue {
  const serviceMap = new Map(services.map((s) => [s.id, s]))
  const barberMap = new Map(barbers.map((b) => [b.id, b]))
  return {
    services: services.filter((s) => s.active),
    barbers: barbers.filter((b) => b.active),
    gallery,
    contact,
    serviceById: (id) => serviceMap.get(id) ?? unknownService(id),
    barberById: (id) => barberMap.get(id) ?? unknownBarber(id),
  }
}
