import { ChevronLeft, LogOut, Moon, Sun } from 'lucide-react'

import { useStaff } from '../auth/staff-context'
import { PageHeader } from '../components/page-header'
import { navigate } from '../lib/router'
import { useAdminTheme } from '../lib/use-admin-theme'
import { useNavRoutes } from './nav-items'

/** Phone menu for everything that doesn't fit the bottom bar. */
export function MorePage({ onSignOut }: { onSignOut: () => void }) {
  const staff = useStaff()
  const items = useNavRoutes().filter((r) => !r.primaryOnPhone)
  const { theme, toggle } = useAdminTheme()
  const row = 'flex h-14 w-full items-center gap-3.5 px-4 text-start text-body active:bg-[var(--row-pressed)]'

  return (
    <div>
      <PageHeader title="עוד" subtitle={`${staff.name} · ${staff.role === 'owner' ? 'בעלים' : 'ספר'}`} />
      {items.length > 0 && (
        <div className="divide-y overflow-hidden rounded-[24px] bg-card shadow-elevation">
          {items.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => navigate(id)} className={row}>
              <Icon className="size-5 text-brass" strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              <ChevronLeft className="size-4 text-tertiary" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 divide-y overflow-hidden rounded-[24px] bg-card shadow-elevation">
        <button type="button" onClick={toggle} className={row}>
          {theme === 'dark' ? <Sun className="size-5 text-brass" /> : <Moon className="size-5 text-brass" />}
          <span className="flex-1">{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
        <button type="button" onClick={onSignOut} className={row}>
          <LogOut className="size-5 text-destructive rtl:-scale-x-100" />
          <span className="flex-1 text-destructive">יציאה</span>
        </button>
      </div>
    </div>
  )
}
