import { useEffect, useRef } from 'react'

import type { AccountApi } from './account-api'
import type { AccountState } from './types'
import { cleanProfile, hasErrors, validateProfile } from './validation'

/**
 * After confirming their email the customer is signed in but has no customer
 * record yet: finish it from the details they gave at sign-up, once. If that
 * fails (e.g. the number is taken) the profile form is shown instead.
 */
export function useProfileCompletion(state: AccountState | { status: 'error' }, api: AccountApi, refresh: () => Promise<void>) {
  const attempted = useRef(false)
  useEffect(() => {
    if (state.status !== 'needs-profile' || attempted.current) return
    if (hasErrors(validateProfile(state.suggested))) return
    attempted.current = true
    api.completeProfile(cleanProfile(state.suggested)).then(refresh, () => {})
  }, [state, api, refresh])
}
