import { X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect } from 'react'

import { useCatalogue } from '@/catalogue/catalogue-context'
import { BarberPortrait } from '@/components/barber-portrait'
import { Button } from '@/components/ui/button'
import { formatDuration, formatPrice } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useApp } from '@/store/app-context'

/** Full-screen photo. Drag down (touch) or Esc / ✕ (desktop) to close. */
export function GalleryViewer() {
  const { look, closeLook, openBooking } = useApp()
  const { gallery } = useCatalogue()
  const item = look ? gallery.find((g) => g.id === look.id) : undefined

  useEffect(() => {
    if (!item) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeLook()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [item, closeLook])

  return (
    <AnimatePresence>
      {item && (
        <div key="viewer" className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-label={item.title}>
          <m.div
            className="absolute inset-0 bg-background/90 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeLook}
          />
          <div className="pointer-events-none relative mx-auto flex h-full w-full max-w-3xl flex-col px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[max(env(safe-area-inset-bottom),20px)] lg:py-10">
            <m.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={spring}
              drag="y"
              dragSnapToOrigin
              dragElastic={{ top: 0.08, bottom: 0.7 }}
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 700) closeLook()
              }}
              className="surface-ink pointer-events-auto relative min-h-0 w-full flex-1 touch-none overflow-hidden rounded-[32px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]"
            >
              {/* The whole photo, uncropped: this is where the cut is judged. */}
              <img src={item.imageUrl} alt={item.title} draggable={false} className="absolute inset-0 size-full object-contain" />
            </m.div>
            <m.div
              className="pointer-events-auto shrink-0 px-1 pt-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.08 } }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            >
              {item.category && <p className="text-footnote font-medium text-brass">{item.category}</p>}
              <h2 className="font-display text-title1 font-medium">{item.title}</h2>
              <ItemMeta barberId={item.barberId} serviceId={item.serviceId} />
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => openBooking({ mode: 'new', serviceId: item.serviceId ?? undefined, barberId: item.barberId ?? undefined })}
              >
                קביעת תור לסגנון הזה
              </Button>
            </m.div>
          </div>
          <m.div
            className="absolute end-7 top-[calc(env(safe-area-inset-top)+28px)]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, transition: { ...spring, delay: 0.1 } }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
          >
            <Button variant="glass" size="icon-lg" onClick={closeLook} aria-label="סגירה">
              <X strokeWidth={2.5} />
            </Button>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Who did it and what to book — only what the owner linked to the photo. */
function ItemMeta({ barberId, serviceId }: { barberId: string | null; serviceId: string | null }) {
  const { barberById, serviceById } = useCatalogue()
  if (!barberId && !serviceId) return null
  const barber = barberId ? barberById(barberId) : null
  const service = serviceId ? serviceById(serviceId) : null
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-card p-3 shadow-elevation">
      {barber && <BarberPortrait barber={barber} className="size-11 text-headline" />}
      <div className="min-w-0 flex-1">
        {barber && <p className="text-headline font-semibold">עבודה של {barber.name}</p>}
        {service && (
          <p className="truncate text-footnote text-muted-foreground">
            {service.name} · {formatDuration(service.duration)}
          </p>
        )}
      </div>
      {service && <p className="pe-1 text-headline font-semibold tabular">{formatPrice(service.price)}</p>}
    </div>
  )
}
