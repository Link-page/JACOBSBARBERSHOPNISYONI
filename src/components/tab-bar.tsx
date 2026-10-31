import { Plus } from 'lucide-react'
import { m } from 'motion/react'

import { navItems } from '@/layout/nav-items'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'


/**
 * Floating glass navigation. A brass notch glides to the active tab; booking —
 * the app's main action — has its own ink button beside the bar.
 */
export function TabBar() {
  const { tab, setTab, openBooking, upcoming } = useApp()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),18px)] md:px-[max(1rem,calc(50%-17rem))] lg:hidden">
      <nav aria-label="ניווט ראשי" className="glass pointer-events-auto flex h-16 flex-1 rounded-[24px] px-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200',
                active ? 'text-foreground' : 'text-foreground/50',
              )}
            >
              {active && (
                <m.span
                  layoutId="tab-notch"
                  transition={springSnappy}
                  className="absolute top-0 h-[3px] w-6 rounded-b-full bg-brass"
                />
              )}
              <m.span whileTap={{ scale: 0.84 }} transition={springSnappy} className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.7} />
                {id === 'bookings' && upcoming.length > 0 && (
                  <span className="absolute -end-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] leading-none font-bold text-white tabular">
                    {upcoming.length}
                  </span>
                )}
              </m.span>
              <span className={cn('text-[11px] leading-none', active ? 'font-semibold' : 'font-medium')}>{label}</span>
            </button>
          )
        })}
      </nav>

      <m.button
        type="button"
        onClick={() => openBooking()}
        whileTap={{ scale: 0.88 }}
        transition={springSnappy}
        aria-label="קביעת תור"
        className="pointer-events-auto grid size-16 shrink-0 place-items-center rounded-[24px] bg-primary text-primary-foreground shadow-[0_16px_30px_-14px_rgb(0_0_0/0.55),inset_0_0_0_1px_var(--brass-soft)]"
      >
        <Plus className="size-7" strokeWidth={1.9} />
      </m.button>
    </div>
  )
}
