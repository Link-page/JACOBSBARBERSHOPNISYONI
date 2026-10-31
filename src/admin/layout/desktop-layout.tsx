import { LogOut, Moon, Sun } from 'lucide-react'
import { m } from 'motion/react'
import type { ReactNode } from 'react'

import { springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useStaff } from '../auth/staff-context'
import { navigate, type RouteId } from '../lib/router'
import { useAdminTheme } from '../lib/use-admin-theme'
import { useNavRoutes } from './nav-items'

/** Desktop: persistent sidebar (on the right, following RTL) and a spacious content area. */
export function DesktopLayout({ active, onSignOut, children }: { active: RouteId; onSignOut: () => void; children: ReactNode }) {
  const staff = useStaff()
  const items = useNavRoutes()
  const { theme, toggle } = useAdminTheme()

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-e bg-card/40 px-4 py-6">
        <div className="px-3">
          <p className="wordmark text-headline">JACOB'S</p>
          <p className="text-footnote text-muted-foreground">ניהול העסק</p>
        </div>
        <nav aria-label="ניווט ניהול" className="mt-8 flex flex-col gap-1">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              aria-current={active === id ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-start text-subhead font-medium transition-colors',
                active === id ? 'text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {active === id && (
                <m.span layoutId="sidebar-active" transition={springSnappy} className="absolute inset-0 rounded-[14px] bg-muted">
                  <span className="absolute inset-y-2.5 start-0 w-[3px] rounded-e-full bg-brass" />
                </m.span>
              )}
              <Icon className="relative size-[19px]" strokeWidth={1.8} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t pt-4">
          <div className="px-3 pb-2">
            <p className="truncate text-subhead font-semibold">{staff.name}</p>
            <p className="text-caption text-muted-foreground">{staff.role === 'owner' ? 'בעלים' : 'ספר'}</p>
          </div>
          <button type="button" onClick={toggle} className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-subhead text-muted-foreground hover:bg-muted">
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            {theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          </button>
          <button type="button" onClick={onSignOut} className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-subhead text-muted-foreground hover:bg-muted">
            <LogOut className="size-[18px] rtl:-scale-x-100" />
            יציאה
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8 xl:px-12">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  )
}
