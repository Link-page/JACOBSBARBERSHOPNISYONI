import { m } from 'motion/react'
import type { ReactNode } from 'react'

import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useStaff } from '../auth/staff-context'
import { navigate, type RouteId } from '../lib/router'
import { moreRoute } from '../routes'
import { useNavRoutes } from './nav-items'

/** Phone: compact header, content, and a floating bottom bar like a native app. */
export function PhoneLayout({ active, children }: { active: RouteId; children: ReactNode }) {
  const staff = useStaff()
  const items = [...useNavRoutes().filter((r) => r.primaryOnPhone), moreRoute]
  const inMore = !items.some((r) => r.id === active)

  return (
    <div className="min-h-dvh bg-background">
      {/* 56px of content below the status bar / notch (the padding is added, not taken from it). */}
      <header className="glass-bar sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between px-5 pt-safe">
        <p className="wordmark text-subhead">JACOB'S</p>
        <span className="text-footnote text-muted-foreground">{staff.name}</span>
      </header>
      {/* Bottom padding = the bar's offset + its 64px height + breathing room, so the last item is never under it. */}
      <main className="px-4 pt-4 pb-[calc(max(env(safe-area-inset-bottom),12px)+6.5rem)]">{children}</main>
      <nav
        aria-label="ניווט ניהול"
        className="glass fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-30 flex h-16 rounded-[24px] px-1"
      >
        {items.map(({ id, label, icon: Icon }) => {
          const current = active === id || (id === 'more' && inMore)
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              aria-current={current ? 'page' : undefined}
              className={cn('relative flex flex-1 flex-col items-center justify-center gap-1', current ? 'text-foreground' : 'text-foreground/50')}
            >
              {current && <m.span layoutId="admin-tab" transition={springSnappy} className="absolute top-0 h-[3px] w-6 rounded-b-full bg-brass" />}
              <Icon className="size-[22px]" strokeWidth={current ? 2.1 : 1.7} />
              <span className={cn('text-[11px] leading-none', current ? 'font-semibold' : 'font-medium')}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
