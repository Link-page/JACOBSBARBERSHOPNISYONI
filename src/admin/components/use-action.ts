import { useCallback, useState } from 'react'

import { useAdminData } from '../data/api-context'
import { toAdminError } from '../data/errors'
import { useToast } from './toast-context'

/**
 * Runs a mutation: tracks pending state, refreshes admin data on success and
 * shows the result. Returns the result, or null if it failed.
 */
export function useAction() {
  const { refresh } = useAdminData()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T | null> => {
      setPending(true)
      try {
        const result = await action()
        refresh()
        if (success) toast(success)
        return result
      } catch (error) {
        toast(toAdminError(error).message, 'error')
        return null
      } finally {
        setPending(false)
      }
    },
    [refresh, toast],
  )

  return { run, pending }
}
