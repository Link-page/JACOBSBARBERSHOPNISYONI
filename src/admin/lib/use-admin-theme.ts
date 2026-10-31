import { useCallback, useState } from 'react'

const KEY = 'jacobs.admin.appearance'
type Theme = 'dark' | 'light'

/** Staff UI theme (per device). Dark is the default identity. */
export function useAdminTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Private mode: the choice lasts for this visit.
    }
    setTheme(next)
  }, [theme])
  return { theme, toggle }
}
