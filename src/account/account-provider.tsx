import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { AccountApi } from './account-api'
import { AccountContext, type AccountValue } from './account-context'
import { useProfileCompletion } from './use-profile-completion'
import { cleanProfile } from './validation'

/** Holds the customer's session state and exposes the account actions. */
export function AccountProvider({ api, children }: { api: AccountApi; children: ReactNode }) {
  const [state, setState] = useState<AccountValue['state']>({ status: 'loading' })

  const refresh = useCallback(
    () =>
      api.getState().then(setState, () => setState({ status: 'error' })),
    [api],
  )

  useEffect(() => {
    void refresh()
    return api.subscribe(() => void refresh())
  }, [api, refresh])

  useProfileCompletion(state, api, refresh)

  const value = useMemo<AccountValue>(
    () => ({
      state,
      requiresSignIn: api.requiresSignIn,
      retry: () => void refresh(),
      async signIn(email, password) {
        await api.signIn(email, password)
        await refresh()
      },
      async signUp(input) {
        const result = await api.signUp({ ...input, ...cleanProfile(input) })
        if (!result.needsConfirmation) await refresh()
        return result
      },
      async completeProfile(profile) {
        await api.completeProfile(cleanProfile(profile))
        await refresh()
      },
      resendConfirmation: (email) => api.resendConfirmation(email),
      async signOut() {
        await api.signOut()
        setState({ status: 'signed-out' })
      },
    }),
    [api, state, refresh],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
