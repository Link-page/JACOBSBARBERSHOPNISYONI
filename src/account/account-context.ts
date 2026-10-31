import { createContext, useContext } from 'react'

import type { AccountState, ProfileInput, SignUpInput } from './types'

export type AccountValue = {
  state: AccountState | { status: 'error' }
  requiresSignIn: boolean
  retry: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>
  completeProfile: (profile: ProfileInput) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AccountContext = createContext<AccountValue | null>(null)

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}

/** The signed-in customer. Only valid inside <AccountGate>, which renders the app once ready. */
export function useCustomer() {
  const { state } = useAccount()
  if (state.status !== 'ready') throw new Error('useCustomer must be used inside <AccountGate>')
  return state.profile
}
