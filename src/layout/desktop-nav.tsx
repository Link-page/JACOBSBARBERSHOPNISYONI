import { CalendarPlus } from 'lucide-react'
import { m } from 'motion/react'

import { useCustomer } from '@/account/account-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { shop } from '@/data/shop'
import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

import { navItems } from './nav-items'

/** Desktop: a top bar with the brand, the sections, and booking always one click away. */
export function DesktopNav() {
  const { tab, setTab, openBooking, upcoming } = useApp()
  const profile = useCustomer()

  return (
    <header className="glass-bar absolute inset-x-0 top-0 z-30 hidden h-[72px] lg:block">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-8 px-10">
        <button type="button" onClick={() => setTab('home')} className="flex items-baseline gap-2">
          <span className="wordmark text-headline">{shop.name}</span>
          <span className="text-footnote text-muted-foreground">{shop.descriptor}</span>
        </button>
        <nav aria-label="ניווט ראשי" className="flex h-full flex-1 items-stretch gap-1">
          {navItems.map(({ id, label }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex items-center gap-1.5 px-4 text-subhead transition-colors', active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
                {id === 'bookings' && upcoming.length > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1.5 text-[11px] font-bold text-white tabular">{upcoming.length}</span>
                )}
                {active && <m.span layoutId="desktop-nav" transition={springSnappy} className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brass" />}
              </button>
            )
          })}
        </nav>
        <Button onClick={() => openBooking()}>
          <CalendarPlus className="size-[18px]" />
          קביעת תור
        </Button>
        <button type="button" onClick={() => setTab('profile')} aria-label="פרופיל" className="rounded-full">
          <Avatar aria-hidden className="size-10">
            <AvatarFallback className="text-headline">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  )
}
