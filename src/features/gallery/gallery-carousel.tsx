import { useCatalogue } from '@/catalogue/catalogue-context'
import type { GalleryItem } from '@/catalogue/types'
import { CenterCarousel } from '@/components/carousel/center-carousel'
import { useApp } from '@/store/app-context'

import { GalleryEmpty } from './gallery-empty'
import { GallerySlide } from './gallery-slide'

/** The shop's real haircut photos (Supabase Storage), centre-focused. */
export function GalleryCarousel({ source }: { source: string }) {
  const { gallery, barberById } = useCatalogue()
  const { openLook } = useApp()
  const subtitle = (item: GalleryItem) => (item.barberId ? `עבודה של ${barberById(item.barberId).name}` : undefined)

  if (!gallery.length) return <GalleryEmpty />
  return (
    <CenterCarousel
      items={gallery}
      getKey={(item) => item.id}
      label="גלריית תספורות"
      slideLabel={(item) => item.title}
      aspect={1.3}
      renderSlide={(item) => <GallerySlide item={item} subtitle={subtitle(item)} onOpen={() => openLook(item.id, source)} />}
    />
  )
}
