import type { ReactNode } from 'react'

import { LoadError, Splash } from '@/components/app-status'

import { useAccount } from './account-context'
import { AuthScreen } from './screens/auth-screen'
import { CompleteProfileScreen } from './screens/complete-profile-screen'

/** Shows sign-in / sign-up until the customer has an account with a complete profile. */
export function AccountGate({ children }: { children: ReactNode }) {
  const { state, retry } = useAccount()
  switch (state.status) {
    case 'loading':
      return <Splash />
    case 'error':
      return <LoadError message="לא הצלחנו להתחבר לשרת. בדקו את החיבור לאינטרנט." onRetry={retry} />
    case 'signed-out':
      return <AuthScreen />
    case 'needs-profile':
      return <CompleteProfileScreen email={state.email} suggested={state.suggested} />
    case 'ready':
      return children
  }
}
