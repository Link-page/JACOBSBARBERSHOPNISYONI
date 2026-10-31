import type { Barber } from '@/catalogue/types'
import { cn } from '@/lib/utils'

import { FadeImage } from './fade-image'

/**
 * Circular barber photo over the barber's initial (the fallback when there is
 * no photo or it fails). Decorative — the name is always shown beside it.
 */
export function BarberPortrait({ barber, className }: { barber: Pick<Barber, 'photoUrl' | 'initial'>; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-display font-medium text-brass ring-1 ring-brass/40',
        className,
      )}
    >
      {barber.initial}
      {/* Faces sit in the upper part of a portrait. */}
      {barber.photoUrl && <FadeImage src={barber.photoUrl} className="object-[50%_28%]" />}
    </span>
  )
}
