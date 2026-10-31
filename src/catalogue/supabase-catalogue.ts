import type { SupabaseClient } from '@supabase/supabase-js'

import { mediaUrl } from '@/lib/supabase/media'

import type { CatalogueApi } from './catalogue-api'
import type { Barber, GalleryItem, Service } from './types'

type ServiceRow = { id: string; name: string; description: string; duration_minutes: number; price: string | number; active: boolean }
type BarberRow = { id: string; name: string; bio: string; photo_path: string | null; active: boolean; whatsapp: string; barber_services: { service_id: string }[] }
type GalleryRow = { id: string; title: string; category: string; image_path: string; barber_id: string | null; service_id: string | null }

const toService = (r: ServiceRow): Service => ({
  id: r.id,
  name: r.name,
  description: r.description,
  duration: r.duration_minutes,
  price: Number(r.price),
  active: r.active,
})

const toBarber = (r: BarberRow): Barber => ({
  id: r.id,
  name: r.name,
  initial: r.name.trim().charAt(0),
  bio: r.bio,
  photoUrl: mediaUrl(r.photo_path),
  serviceIds: r.barber_services.map((s) => s.service_id),
  active: r.active,
  whatsapp: r.whatsapp ?? '',
})

/** Photos without a usable image are left out rather than shown broken. */
const toGalleryItems = (rows: GalleryRow[]): GalleryItem[] =>
  rows.flatMap((r) => {
    const imageUrl = mediaUrl(r.image_path)
    return imageUrl ? [{ id: r.id, title: r.title, category: r.category, imageUrl, barberId: r.barber_id, serviceId: r.service_id }] : []
  })

function rows<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message)
  return result.data ?? []
}

/** The public catalogue, readable without signing in (see 0006_access_control.sql). */
export function createSupabaseCatalogue(db: SupabaseClient): CatalogueApi {
  return {
    async load() {
      const [services, barbers, gallery, settings] = await Promise.all([
        // Inactive services and barbers are loaded too, so past appointments still show their names.
        db.from('services').select('id, name, description, duration_minutes, price, active').order('sort_order'),
        db.from('barbers').select('id, name, bio, photo_path, active, whatsapp, barber_services(service_id)').order('sort_order'),
        db.from('gallery_items').select('id, title, category, image_path, barber_id, service_id').eq('active', true).order('sort_order'),
        db.from('business_settings').select('phone, whatsapp').maybeSingle<{ phone: string; whatsapp: string }>(),
      ])
      return {
        services: rows<ServiceRow>(services).map(toService),
        barbers: rows<BarberRow>(barbers).map(toBarber),
        gallery: toGalleryItems(rows<GalleryRow>(gallery)),
        contact: { phone: settings.data?.phone ?? '', whatsapp: settings.data?.whatsapp ?? '' },
      }
    },
  }
}
