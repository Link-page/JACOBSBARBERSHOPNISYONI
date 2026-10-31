import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
  )
}

/** Desktop layouts (admin sidebar, customer top navigation); below this width both behave like phone apps. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
