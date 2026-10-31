import { m } from 'motion/react'

import { LookArtwork } from '@/components/look-artwork'
import { barberById, type Look } from '@/data/shop'
import { spring } from '@/lib/motion'
import { tones } from '@/lib/tones'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

type LookCardProps = {
  look: Look
  /** Where the card lives — keeps shared-element ids unique across tabs. */
  source: string
  /** Height / width override; defaults to the look's own ratio. */
  ratio?: number
  className?: string
}

export function LookCard({ look, source, ratio, className }: LookCardProps) {
  const { openLook } = useApp()
  const light = !look.image && tones[look.tone].light

  return (
    <m.button
      type="button"
      layoutId={`${source}-look-${look.id}`}
      onClick={() => openLook(look.id, source)}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      style={{ borderRadius: 24, aspectRatio: `1 / ${ratio ?? look.ratio}` }}
      className={cn('relative block w-full overflow-hidden text-start', className)}
      aria-label={`${look.title}, עבודה של ${barberById(look.barberId).name}`}
    >
      <LookArtwork look={look} />
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col px-3.5 pt-10 pb-3.5',
          light
            ? 'bg-linear-to-t from-white/85 via-white/30 to-transparent text-black'
            : 'bg-linear-to-t from-black/70 via-black/25 to-transparent text-white',
        )}
      >
        <span className="text-caption font-medium opacity-70">{look.category}</span>
        <span className="font-display text-headline leading-tight font-medium">{look.title}</span>
      </span>
    </m.button>
  )
}
