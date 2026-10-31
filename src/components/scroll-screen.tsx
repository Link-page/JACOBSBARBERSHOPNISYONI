import { m, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

type ScrollScreenProps = {
  /** Shown in the compact navigation bar once the large title scrolls away. */
  title: ReactNode
  largeTitle?: ReactNode
  eyebrow?: ReactNode
  accessory?: ReactNode
  children: ReactNode
}

/**
 * A tab's scroll view with a collapsing title: the large title stretches on
 * overscroll, then hands off to a compact glass bar as content scrolls under it.
 */
export function ScrollScreen({ title, largeTitle, eyebrow, accessory, children }: ScrollScreenProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: ref })
  const barOpacity = useTransform(scrollY, [44, 72], [0, 1])
  const titleOpacity = useTransform(scrollY, [24, 64], [1, 0])
  const titleScale = useTransform(scrollY, [-160, 0], [1.1, 1], { clamp: true })

  return (
    <div className="relative h-full">
      <m.div
        aria-hidden
        style={{ opacity: barOpacity }}
        className="glass-bar pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe lg:hidden"
      >
        <div className="flex h-11 items-center justify-center font-display text-headline font-medium">{title}</div>
      </m.div>

      <m.div
        ref={ref}
        layoutScroll
        className="scrollbar-none absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
      >
        {/* Centred column on wide screens; room for the tab bar below on phones and tablets. */}
        <div className="mx-auto w-full max-w-6xl px-5 pt-safe pb-40 md:px-8 lg:px-10 lg:pt-6 lg:pb-20">
          <header className="flex items-end justify-between gap-4 pt-5">
            <m.div style={{ opacity: titleOpacity, scale: titleScale }} className="min-w-0 ltr:origin-left rtl:origin-right">
              {eyebrow && <p className="mb-1 text-footnote font-medium text-muted-foreground">{eyebrow}</p>}
              <h1 className="font-display text-large-title font-medium text-balance">{largeTitle ?? title}</h1>
            </m.div>
            {accessory && <div className="shrink-0 pb-1">{accessory}</div>}
          </header>
          {children}
        </div>
      </m.div>

      {/* Scroll-edge effect: content dissolves before it reaches the tab bar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-linear-to-t from-background from-15% via-background/75 to-transparent lg:hidden"
      />
    </div>
  )
}
