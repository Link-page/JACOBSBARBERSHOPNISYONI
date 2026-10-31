/** The shop's public catalogue: what can be booked, with whom, and the work gallery. */

export type Service = {
  id: string
  name: string
  description: string
  /** Default length in minutes (a barber may take longer; the server decides). */
  duration: number
  price: number
  /** Inactive ones are kept only to label past appointments. */
  active: boolean
}

export type Barber = {
  id: string
  name: string
  /** First letter, shown when there is no photo. */
  initial: string
  /** Short description or specialisation, written by the owner. */
  bio: string
  photoUrl: string | null
  /** Services this barber performs. */
  serviceIds: string[]
  active: boolean
}

export type GalleryItem = {
  id: string
  title: string
  category: string
  imageUrl: string
  barberId: string | null
  serviceId: string | null
}

export type Catalogue = {
  services: Service[]
  barbers: Barber[]
  gallery: GalleryItem[]
}
