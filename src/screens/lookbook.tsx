import { m } from 'motion/react'
import { useMemo, useState } from 'react'

import { useCatalogue } from '@/catalogue/catalogue-context'
import { ScrollScreen } from '@/components/scroll-screen'
import { GalleryEmpty } from '@/features/gallery/gallery-empty'
import { GalleryTile } from '@/features/gallery/gallery-tile'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

const ALL = 'הכול'

/** The shop's real work, filterable by the categories the owner gave the photos. */
export function LookbookScreen() {
  const { gallery } = useCatalogue()
  const { openLook } = useApp()
  const [filter, setFilter] = useState(ALL)
  const categories = useMemo(() => [...new Set(gallery.map((g) => g.category).filter(Boolean))], [gallery])
  const shown = filter === ALL ? gallery : gallery.filter((g) => g.category === filter)

  return (
    <ScrollScreen title="גלריה" eyebrow="עבודות מהמספרה">
      {categories.length > 1 && (
        <div className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="סינון לפי סגנון">
          {[ALL, ...categories].map((option) => {
            const active = option === filter
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(option)}
                className={cn('pressable relative h-9 shrink-0 rounded-full px-4 text-subhead font-semibold', !active && 'bg-card shadow-elevation')}
              >
                {active && <m.span layoutId="lookbook-filter" transition={springSnappy} className="absolute inset-0 rounded-full bg-primary" />}
                <span className={cn('relative transition-colors duration-200', active && 'text-primary-foreground')}>{option}</span>
              </button>
            )
          })}
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="mt-6">
          <GalleryEmpty />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {shown.map((item) => (
            <GalleryTile key={item.id} item={item} onOpen={() => openLook(item.id, 'lookbook')} />
          ))}
        </div>
      )}
    </ScrollScreen>
  )
}
