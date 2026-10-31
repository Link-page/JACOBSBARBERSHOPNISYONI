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

/** Desktop gets the sidebar layout; below this width the app behaves like a phone app. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
