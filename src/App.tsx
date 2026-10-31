import { LazyMotion, MotionConfig } from 'motion/react'

import { AccountGate } from '@/account/account-gate'
import { AccountProvider } from '@/account/account-provider'
import { backend } from '@/backend'
import { CatalogueProvider } from '@/catalogue/catalogue-provider'
import { AppShell } from '@/layout/app-shell'
import { NotificationsProvider } from '@/notifications/notifications-provider'
import { AppProvider } from '@/store/app-provider'

const loadMotionFeatures = () => import('@/lib/motion-features').then((mod) => mod.default)

/**
 * Account → catalogue → app state. Signing out unmounts everything below the
 * gate, so one customer's data never lingers for the next.
 */
export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AccountProvider api={backend.account}>
          <AccountGate>
            <CatalogueProvider api={backend.catalogue}>
              <AppProvider>
                <NotificationsProvider api={backend.notifications}>
                  <AppShell />
                </NotificationsProvider>
              </AppProvider>
            </CatalogueProvider>
          </AccountGate>
        </AccountProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
