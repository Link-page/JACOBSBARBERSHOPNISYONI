import { CalendarPlus } from 'lucide-react'

import type { Barber } from '@/catalogue/types'
import { FadeImage } from '@/components/fade-image'
import { NextFreeLabel } from '@/components/next-free-label'
import { Button } from '@/components/ui/button'

/** One barber in the team carousel: portrait, name, specialisation, next opening, book. */
export function BarberSlide({ barber, serviceId, duration, onBook }: { barber: Barber; serviceId?: string; duration: number; onBook: () => void }) {
  return (
    <article className="flex size-full flex-col overflow-hidden rounded-[28px] bg-card shadow-elevation">
      <div className="surface-ink relative min-h-0 flex-1 overflow-hidden">
        {/* Fallback under the photo: the initial on the brand surface. */}
        <span aria-hidden className="absolute inset-0 grid place-items-center font-display text-[96px] text-brass/70">
          {barber.initial}
        </span>
        {barber.photoUrl && <FadeImage src={barber.photoUrl} className="object-[50%_25%]" />}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
        {serviceId && (
          <NextFreeLabel
            serviceId={serviceId}
            barberId={barber.id}
            duration={duration}
            prefix="פנוי · "
            className="glass absolute start-3 bottom-3 rounded-full px-3 py-1 text-caption font-semibold text-foreground tabular"
          />
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-title2 font-medium">{barber.name}</h3>
          {barber.bio && <p className="line-clamp-1 text-footnote text-muted-foreground">{barber.bio}</p>}
        </div>
        <Button size="sm" className="h-10 w-full" onClick={onBook}>
          <CalendarPlus className="size-4" />
          קביעת תור אצל {barber.name}
        </Button>
      </div>
    </article>
  )
}
