import { AnimatePresence, m } from 'motion/react'
import { Suspense } from 'react'

import { useStaff } from './auth/staff-context'
import { ListSkeleton } from './components/empty-state'
import { AppointmentSheetsProvider } from './features/appointments/appointment-sheets'
import { DesktopLayout } from './layout/desktop-layout'
import { MorePage } from './layout/more-page'
import { PhoneLayout } from './layout/phone-layout'
import { isOwner } from './lib/permissions'
import { useRoute, type RouteId } from './lib/router'
import { useIsDesktop } from '@/hooks/use-media-query'
import { pages } from './pages'
import { routes } from './routes'

/** Resolves the route this user may see: owner-only pages fall back to the dashboard. */
function useAllowedRoute(): RouteId {
  const staff = useStaff()
  const desktop = useIsDesktop()
  const { id } = useRoute()
  if (id === 'more') return desktop ? 'dashboard' : 'more'
  const def = routes.find((r) => r.id === id)
  return def?.ownerOnly && !isOwner(staff) ? 'dashboard' : id
}

export function AdminShell({ onSignOut }: { onSignOut: () => void }) {
  const desktop = useIsDesktop()
  const route = useAllowedRoute()
  const Page = route === 'more' ? null : pages[route]

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }}>
        <Suspense fallback={<ListSkeleton />}>{Page ? <Page /> : <MorePage onSignOut={onSignOut} />}</Suspense>
      </m.div>
    </AnimatePresence>
  )

  return (
    <AppointmentSheetsProvider>
      {desktop ? (
        <DesktopLayout active={route} onSignOut={onSignOut}>
          {content}
        </DesktopLayout>
      ) : (
        <PhoneLayout active={route}>{content}</PhoneLayout>
      )}
    </AppointmentSheetsProvider>
  )
}
