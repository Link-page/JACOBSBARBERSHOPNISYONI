import { Expand } from 'lucide-react'

import type { GalleryItem } from '@/catalogue/types'
import { FadeImage } from '@/components/fade-image'

/** One haircut photo with its name; the centre card opens the full-screen viewer. */
export function GallerySlide({ item, subtitle, onOpen }: { item: GalleryItem; subtitle?: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.title} — הגדלה`}
      className="relative block size-full overflow-hidden rounded-[28px] bg-muted text-start shadow-elevation"
    >
      <FadeImage src={item.imageUrl} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pt-16 pb-5 text-white">
        {item.category && <p className="text-caption font-semibold tracking-wide text-brass">{item.category}</p>}
        <p className="font-display text-title2 leading-tight font-medium">{item.title}</p>
        {subtitle && <p className="mt-0.5 text-footnote text-white/75">{subtitle}</p>}
      </div>
      <span aria-hidden className="glass absolute end-3 top-3 grid size-9 place-items-center rounded-full text-foreground">
        <Expand className="size-4" />
      </span>
    </button>
  )
}
