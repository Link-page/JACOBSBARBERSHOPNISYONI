import { CalendarDays, House, Images, Plus, UserRound } from 'lucide-react'
import { m } from 'motion/react'

import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'
import type { Tab } from '@/store/types'

const items: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'lookbook', label: 'Lookbook', icon: Images },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

/**
 * Floating Liquid Glass tab bar. A glass lens glides between tabs; the
 * primary action — booking — sits apart in its own prominent glass button,
 * the way iOS 26 separates search from tabs.
 */
export function TabBar() {
  const { tab, setTab, openBooking, upcoming } = useApp()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),18px)]">
      <nav aria-label="Main" className="glass pointer-events-auto flex h-16 flex-1 rounded-full p-[5px]">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[3px] rounded-full transition-colors duration-200',
                active ? 'text-foreground' : 'text-foreground/55',
              )}
            >
              {active && (
                <m.span
                  layoutId="tab-lens"
                  transition={springSnappy}
                  className="absolute inset-0 rounded-full bg-[var(--lens)] shadow-[inset_0_1px_0.5px_var(--glass-highlight)]"
                />
              )}
              <m.span whileTap={{ scale: 0.84 }} transition={springSnappy} className="relative">
                <Icon className="size-[23px]" strokeWidth={active ? 2.25 : 1.85} />
                {id === 'bookings' && upcoming.length > 0 && (
                  <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground tabular">
                    {upcoming.length}
                  </span>
                )}
              </m.span>
              <span className="relative text-[10px] leading-none font-semibold tracking-[0.01em]">{label}</span>
            </button>
          )
        })}
      </nav>

      <m.button
        type="button"
        onClick={() => openBooking()}
        whileTap={{ scale: 0.88 }}
        transition={springSnappy}
        aria-label="Book an appointment"
        className="glass pointer-events-auto grid size-16 shrink-0 place-items-center rounded-full !bg-primary text-primary-foreground"
      >
        <Plus className="size-7" strokeWidth={2.2} />
      </m.button>
    </div>
  )
}
