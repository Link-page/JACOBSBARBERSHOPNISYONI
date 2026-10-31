import { createContext, useContext } from 'react'

import type { Barber, GalleryItem, Service, ShopContact } from './types'

export type CatalogueValue = {
  /** Bookable now (active), in the owner's order. */
  services: Service[]
  barbers: Barber[]
  gallery: GalleryItem[]
  contact: ShopContact
  /** Any service or barber, including retired ones (past appointments). */
  serviceById: (id: string) => Service
  barberById: (id: string) => Barber
}

export const CatalogueContext = createContext<CatalogueValue | null>(null)

export function useCatalogue() {
  const ctx = useContext(CatalogueContext)
  if (!ctx) throw new Error('useCatalogue must be used inside <CatalogueProvider>')
  return ctx
}
