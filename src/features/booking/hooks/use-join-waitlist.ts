import { useCallback, useState } from 'react'

import { toBookingError, type WaitlistReceipt, type WaitlistRequest } from '@/api'
import { backend } from '@/backend'

type State = { status: 'idle' | 'pending' } | { status: 'error'; message: string } | { status: 'done'; receipt: WaitlistReceipt }

/** Submits a waiting-list request and tracks its progress. */
export function useJoinWaitlist() {
  const [state, setState] = useState<State>({ status: 'idle' })

  const join = useCallback(async (request: WaitlistRequest) => {
    setState({ status: 'pending' })
    try {
      const receipt = await backend.booking.joinWaitlist(request)
      setState({ status: 'done', receipt })
      return receipt
    } catch (error) {
      setState({ status: 'error', message: toBookingError(error).message })
      return null
    }
  }, [])

  return { state, error: state.status === 'error' ? state.message : null, join }
}
