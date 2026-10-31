import { barbers, services, shop } from '@/data/shop'

import type { CatalogueApi } from './catalogue-api'

/**
 * On-device demo catalogue (no backend configured). It has no gallery: the
 * demo must not pass off placeholder artwork as real haircut photography.
 */
export const localCatalogue: CatalogueApi = {
  async load() {
    return {
      services: services.map(({ id, name, description, duration, price }) => ({ id, name, description, duration, price, active: true })),
      barbers: barbers.map((b) => ({ id: b.id, name: b.name, initial: b.initial, bio: b.role, photoUrl: null, serviceIds: services.map((s) => s.id), active: true, whatsapp: '' })),
      gallery: [],
      contact: { phone: shop.phone, whatsapp: shop.whatsapp },
    }
  },
}
