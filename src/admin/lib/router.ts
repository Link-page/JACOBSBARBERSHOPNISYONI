import { useSyncExternalStore } from 'react'

/*
 * Hash-based routes (#/calendar?view=week) — deep links work on static hosting
 * such as GitHub Pages without server rewrites.
 */

export type RouteId = 'dashboard' | 'calendar' | 'waitlist' | 'customers' | 'notifications' | 'barbers' | 'services' | 'settings' | 'more'

const ids: RouteId[] = ['dashboard', 'calendar', 'waitlist', 'customers', 'notifications', 'barbers', 'services', 'settings', 'more']

function parse(hash: string) {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  const id = (ids.includes(path as RouteId) ? path : 'dashboard') as RouteId
  return { id, params: new URLSearchParams(query) }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parse(hash)
}

export function navigate(id: RouteId, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString()
  window.location.hash = `/${id}${query ? `?${query}` : ''}`
}

/** Updates query parameters of the current route without adding history entries. */
export function setParams(params: Record<string, string>) {
  const { id, params: current } = parse(window.location.hash)
  for (const [key, value] of Object.entries(params)) current.set(key, value)
  history.replaceState(null, '', `#/${id}?${current.toString()}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
