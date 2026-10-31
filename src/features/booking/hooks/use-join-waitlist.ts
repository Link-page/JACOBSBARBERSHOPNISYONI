import { useCallback, useState } from 'react'

import { api, type WaitlistReceipt, type WaitlistRequest } from '@/api'

type State = { status: 'idle' | 'pending' | 'error' } | { status: 'done'; receipt: WaitlistReceipt }

/** Submits a waiting-list request and tracks its progress. */
export function useJoinWaitlist() {
  const [state, setState] = useState<State>({ status: 'idle' })

  const join = useCallback(async (request: WaitlistRequest) => {
    setState({ status: 'pending' })
    try {
      const receipt = await api.joinWaitlist(request)
      setState({ status: 'done', receipt })
      return receipt
    } catch {
      setState({ status: 'error' })
      return null
    }
  }, [])

  return { state, join }
}
