import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const cache = new Map<string, unknown>()

export type QueryState<T> = { data: T | undefined; loading: boolean; error: unknown; reload: () => void }

/** The most recent response, tagged with the request it answers. */
type Settled<T> = { key: string; attempt: number; data?: T; error?: unknown }

/**
 * Loads data for `key` (null skips loading). Results are cached per key, so
 * returning to a month or day renders instantly while it refreshes, and a
 * response that arrives after the key changed is ignored.
 */
export function useQuery<T>(key: string | null, load: () => Promise<T>): QueryState<T> {
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    if (key === null) return
    let live = true
    loadRef.current().then(
      (data) => {
        cache.set(key, data)
        if (live) setSettled({ key, attempt, data })
      },
      (error: unknown) => {
        if (live) setSettled({ key, attempt, error })
      },
    )
    return () => {
      live = false
    }
  }, [key, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const current = settled?.key === key ? settled : null
  const fresh = current?.attempt === attempt

  return {
    // Never another key's data: fall back to this key's cache while it loads.
    data: current?.data ?? (key ? (cache.get(key) as T | undefined) : undefined),
    loading: key !== null && !fresh,
    error: fresh ? current?.error : undefined,
    reload,
  }
}

/** Drops cached results whose key starts with `prefix`, e.g. after a booking changes availability. */
export function invalidateQueries(prefix = '') {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}
