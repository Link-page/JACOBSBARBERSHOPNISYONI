import { X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'

import { BarberAvatar } from '@/components/barber-avatar'
import { LookArtwork } from '@/components/look-artwork'
import { Button } from '@/components/ui/button'
import { barberById, lookById, serviceById } from '@/data/shop'
import { formatDuration, formatPrice } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useApp } from '@/store/app-context'

/** Full-screen look detail. The card flies in from where it was tapped; drag down to dismiss. */
export function LookViewer() {
  const { look, closeLook, openBooking } = useApp()
  const data = look ? lookById(look.id) : undefined

  return (
    <AnimatePresence>
      {look && data && (
        <div key="viewer" className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-label={data.title}>
          <m.div
            className="absolute inset-0 bg-background/90 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeLook}
          />

          <div className="pointer-events-none relative flex h-full flex-col px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[max(env(safe-area-inset-bottom),20px)]">
            <m.div
              layoutId={`${look.source}-look-${data.id}`}
              transition={spring}
              drag="y"
              dragSnapToOrigin
              dragElastic={{ top: 0.08, bottom: 0.7 }}
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 700) closeLook()
              }}
              style={{ borderRadius: 32 }}
              className="pointer-events-auto relative min-h-0 w-full flex-1 touch-none overflow-hidden shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]"
            >
              <LookArtwork look={data} />
            </m.div>

            <m.div
              className="pointer-events-auto shrink-0 px-1 pt-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.08 } }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            >
              <p className="text-footnote font-medium text-brass">{data.category}</p>
              <h2 className="font-display text-title1 font-medium">{data.title}</h2>
              <LookMeta barberId={data.barberId} serviceId={data.serviceId} />
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => openBooking({ mode: 'new', serviceId: data.serviceId, barberId: data.barberId })}
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

function LookMeta({ barberId, serviceId }: { barberId: string; serviceId: string }) {
  const barber = barberById(barberId)
  const service = serviceById(serviceId)
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-card p-3 shadow-elevation">
      <BarberAvatar barber={barber} className="size-11 text-headline" />
      <div className="min-w-0 flex-1">
        <p className="text-headline font-semibold">עבודה של {barber.name}</p>
        <p className="truncate text-footnote text-muted-foreground">
          {service.name} · {formatDuration(service.duration)}
        </p>
      </div>
      <p className="pe-1 text-headline font-semibold tabular">{formatPrice(service.price)}</p>
    </div>
  )
}
