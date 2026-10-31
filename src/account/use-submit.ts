import { useCallback, useState } from 'react'

import { toAccountError } from './errors'

/** Runs a form action: tracks pending state and keeps the server's message. */
export function useSubmit() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async (action: () => Promise<void>) => {
    setPending(true)
    setError(null)
    try {
      await action()
      return true
    } catch (e) {
      setError(toAccountError(e).message)
      return false
    } finally {
      setPending(false)
    }
  }, [])
  return { pending, error, run }
}
