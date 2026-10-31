import { useEffect, useState } from 'react'

/**
 * True once `flag` has stayed true for `delay` ms. Keeps skeletons from
 * flashing when data arrives almost immediately.
 */
export function useDelayedFlag(flag: boolean, delay = 180) {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!flag) return
    const id = setTimeout(() => setElapsed(true), delay)
    return () => {
      clearTimeout(id)
      setElapsed(false)
    }
  }, [flag, delay])
  return flag && elapsed
}
