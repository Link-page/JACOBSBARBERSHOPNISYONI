/*
 * Which Supabase API keys may ship in browser code. No imports, so the CI
 * scripts can load this file directly with Node.
 */

export type SupabaseKeyKind = 'publishable' | 'legacy-anon' | 'secret' | 'invalid'

function jwtRole(token: string): unknown {
  const parts = token.split('.')
  if (parts.length !== 3) return undefined
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return (JSON.parse(atob(padded)) as { role?: unknown }).role
  } catch {
    return undefined
  }
}

/**
 * Classifies a key by its format without revealing it. Publishable keys
 * (`sb_publishable_…`) and legacy anon JWTs are browser-safe; `sb_secret_…`
 * keys and service-role JWTs bypass Row Level Security and must never ship.
 */
export function classifySupabaseKey(key: string | null | undefined): SupabaseKeyKind {
  const value = (key ?? '').trim()
  if (value.startsWith('sb_publishable_')) return 'publishable'
  if (value.startsWith('sb_secret_')) return 'secret'
  const role = jwtRole(value)
  if (role === 'anon') return 'legacy-anon'
  if (role === 'service_role') return 'secret'
  return 'invalid'
}

export const isBrowserSafeKey = (kind: SupabaseKeyKind) => kind === 'publishable' || kind === 'legacy-anon'

/** A project URL: https, no credentials, path, query or fragment. */
export function isValidSupabaseUrl(value: string | null | undefined) {
  try {
    const url = new URL((value ?? '').trim())
    return url.protocol === 'https:' && !url.username && !url.password && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash
  } catch {
    return false
  }
}
