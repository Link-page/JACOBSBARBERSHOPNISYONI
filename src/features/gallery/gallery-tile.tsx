import type { GalleryItem } from '@/catalogue/types'
import { FadeImage } from '@/components/fade-image'

/** A photo in the gallery grid; opens the full-screen viewer. */
export function GalleryTile({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable relative block aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-muted text-start shadow-elevation"
    >
      <FadeImage src={item.imageUrl} />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3.5 pt-10 pb-3 text-white">
        <span className="line-clamp-1 block text-subhead font-semibold">{item.title}</span>
        {item.category && <span className="block text-caption text-white/70">{item.category}</span>}
      </span>
    </button>
  )
}
