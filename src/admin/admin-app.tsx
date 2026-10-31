import { LazyMotion, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'

import { AdminShell } from './admin-shell'
import { NotStaffScreen, SignInScreen, SplashScreen } from './auth/auth-screens'
import { StaffContext } from './auth/staff-context'
import { ToastProvider } from './components/toast'
import type { AdminApi } from './data/admin-api'
import { AdminDataProvider } from './data/admin-data-provider'
import { useAdminData } from './data/api-context'
import type { PrototypeBackend } from './data/prototype'
import type { AuthState } from './data/types'
import { PrototypeBanner } from './layout/prototype-banner'

const loadMotionFeatures = () => import('@/lib/motion-features').then((mod) => mod.default)

/**
 * Shows the admin only to signed-in staff. The role shown here comes from the
 * backend, which also enforces it on every request.
 */
function AuthGate() {
  const { api, refresh } = useAdminData()
  const [state, setState] = useState<AuthState | null>(null)

  useEffect(() => {
    let live = true
    const load = () =>
      api.auth
        .getState()
        .then((s) => live && setState(s))
        .catch(() => live && setState({ status: 'signed-out' }))
    load()
    const unsubscribe = api.auth.subscribe(() => {
      load()
      refresh()
    })
    return () => {
      live = false
      unsubscribe()
    }
  }, [api, refresh])

  if (!state) return <SplashScreen />
  if (state.status === 'signed-out') return <SignInScreen onSignIn={(email, password) => api.auth.signIn(email, password)} />
  if (state.status === 'not-staff') return <NotStaffScreen email={state.email} onSignOut={() => api.auth.signOut()} />
  return (
    <StaffContext.Provider value={state.staff}>
      <AdminShell onSignOut={() => api.auth.signOut()} />
    </StaffContext.Provider>
  )
}

export function AdminApp({ api, prototype }: { api: AdminApi; prototype?: PrototypeBackend }) {
  const [, rerender] = useState(0)
  // The banner reflects the prototype's simulated role.
  useEffect(() => (prototype ? api.auth.subscribe(() => rerender((n) => n + 1)) : undefined), [api, prototype])

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AdminDataProvider api={api}>
          <ToastProvider>
            {prototype && <PrototypeBanner prototype={prototype} />}
            <AuthGate />
          </ToastProvider>
        </AdminDataProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
