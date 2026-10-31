import { ChevronLeft, ChevronRight } from 'lucide-react'
import { animate, m, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { inlineSign } from '@/lib/direction'
import { cn } from '@/lib/utils'

import { NEIGHBOUR_SCALE, clamp, defaultCardWidth, keyTarget, settleIndex, slideRole, slideStep, type SlideRole } from './carousel-math'
import { useElementWidth } from './use-element-width'

const spring = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 } as const

/** How each card looks by its distance from the centre. Dimmed, never blurred: photos stay recognisable. */
const roleStyle: Record<SlideRole, { scale: number; opacity: number; filter: string }> = {
  active: { scale: 1, opacity: 1, filter: 'brightness(1)' },
  near: { scale: NEIGHBOUR_SCALE, opacity: 0.62, filter: 'brightness(0.72)' },
  far: { scale: 0.76, opacity: 0, filter: 'brightness(0.6)' },
}

export type CenterCarouselProps<T> = {
  items: T[]
  getKey: (item: T) => string
  /** Accessible name of the carousel, e.g. "הצוות". */
  label: string
  /** Accessible name of one card, e.g. the barber's name. */
  slideLabel: (item: T) => string
  renderSlide: (item: T, state: { active: boolean }) => ReactNode
  /** Card height ÷ width. */
  aspect: number
  cardWidth?: (containerWidth: number) => number
  className?: string
}

/**
 * Centre-focused carousel: the active card is full size, its neighbours smaller
 * and dimmed. Swipe (touch), drag (mouse), arrow keys, the side buttons, or
 * click a neighbour to bring it forward. Vertical page scrolling is left alone.
 */
export function CenterCarousel<T>({ items, getKey, label, slideLabel, renderSlide, aspect, cardWidth = defaultCardWidth, className }: CenterCarouselProps<T>) {
  const viewport = useRef<HTMLDivElement>(null)
  const containerWidth = useElementWidth(viewport)
  const width = containerWidth ? cardWidth(containerWidth) : 0
  const gap = containerWidth >= 1024 ? 28 : 14
  const step = slideStep(width, gap)
  const [active, setActive] = useState(0)
  const index = clamp(active, 0, Math.max(0, items.length - 1))
  const reduceMotion = useReducedMotion()

  // The track moves so the active card sits in the centre. `sign` mirrors it for right-to-left.
  const sign = inlineSign()
  const x = useMotionValue(0)
  const target = -index * step * sign
  useEffect(() => {
    if (reduceMotion) x.set(target)
    else void animate(x, target, spring)
  }, [x, target, reduceMotion])

  // A drag must not also count as a click on the card under the pointer.
  const dragged = useRef(false)
  const go = (next: number) => setActive(clamp(next, 0, items.length - 1))

  const onKeyDown = (event: KeyboardEvent) => {
    const next = keyTarget(event.key, index, items.length, sign < 0)
    if (next === null) return
    event.preventDefault()
    go(next)
  }

  return (
    <section
      aria-roledescription="קרוסלה"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn('group/carousel relative rounded-[32px] outline-none focus-visible:ring-2 focus-visible:ring-brass/60', className)}
    >
      <div ref={viewport} className="relative overflow-hidden py-3" style={{ height: width ? width * aspect + 24 : undefined }}>
        {width > 0 && (
          <m.div
            dir="ltr"
            className="absolute inset-y-3 left-1/2 cursor-grab touch-pan-y active:cursor-grabbing"
            style={{ x }}
            drag={items.length > 1 ? 'x' : false}
            dragDirectionLock
            dragElastic={0.18}
            dragMomentum={false}
            onDragStart={() => (dragged.current = true)}
            onDragEnd={(_, info) => {
              // Dragging against the reading direction brings the next card in.
              const forward = -info.offset.x * sign
              const velocity = -info.velocity.x * sign
              const next = settleIndex(index, forward, velocity, step, items.length)
              if (next === index) void animate(x, target, spring)
              else go(next)
              setTimeout(() => (dragged.current = false), 0)
            }}
          >
            {items.map((item, i) => {
              const role = slideRole(i, index)
              return (
                <m.div
                  key={getKey(item)}
                  role="group"
                  aria-roledescription="פריט"
                  aria-label={`${slideLabel(item)} (${i + 1} מתוך ${items.length})`}
                  aria-hidden={role === 'far' || undefined}
                  className={cn('absolute top-0', role !== 'active' && 'cursor-pointer')}
                  style={{ width, height: width * aspect, left: i * step * sign - width / 2, zIndex: role === 'active' ? 2 : 1 }}
                  initial={false}
                  animate={roleStyle[role]}
                  transition={reduceMotion ? { duration: 0 } : spring}
                  onClick={() => {
                    if (!dragged.current && role !== 'active') go(i)
                  }}
                >
                  {/* Only the centre card is interactive; a tap on a neighbour just brings it forward. */}
                  <div inert={role !== 'active'} className="size-full">
                    {renderSlide(item, { active: role === 'active' })}
                  </div>
                </m.div>
              )
            })}
          </m.div>
        )}
      </div>

      {items.length > 1 && (
        <>
          <ArrowButton side="previous" disabled={index === 0} onClick={() => go(index - 1)} />
          <ArrowButton side="next" disabled={index === items.length - 1} onClick={() => go(index + 1)} />
          <Dots count={items.length} active={index} onSelect={go} />
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {items[index] ? slideLabel(items[index]) : ''}
      </p>
    </section>
  )
}

/** Side buttons for mouse users (hidden on touch screens, where swiping is natural). */
function ArrowButton({ side, disabled, onClick }: { side: 'previous' | 'next'; disabled: boolean; onClick: () => void }) {
  // Logical direction, mirrored once for right-to-left (the app-wide convention).
  const Icon = side === 'previous' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={side === 'previous' ? 'הקודם' : 'הבא'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'glass absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-foreground transition-opacity disabled:opacity-0 pointer-fine:grid',
        side === 'previous' ? 'start-3' : 'end-3',
      )}
    >
      <Icon className="size-5 rtl:-scale-x-100" />
    </button>
  )
}

function Dots({ count, active, onSelect }: { count: number; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="mt-1 flex justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          tabIndex={-1}
          aria-label={`מעבר לפריט ${i + 1}`}
          aria-current={i === active || undefined}
          onClick={() => onSelect(i)}
          className="grid h-6 place-items-center"
        >
          <span className={cn('block h-1.5 rounded-full transition-all duration-300', i === active ? 'w-5 bg-brass' : 'w-1.5 bg-tertiary/60')} />
        </button>
      ))}
    </div>
  )
}
