import { classifySupabaseKey, isBrowserSafeKey, isValidSupabaseUrl } from '@/lib/supabase-key'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * missing  — no backend configured (setup notice)
 * ready    — URL and a browser-safe key (publishable or legacy anon)
 * unsafe   — a secret/service-role key: refuse to use it
 * invalid  — malformed values
 */
export type SupabaseConfigState = 'missing' | 'ready' | 'unsafe' | 'invalid'

function resolveState(): SupabaseConfigState {
  if (!url && !key) return 'missing'
  const kind = classifySupabaseKey(key)
  if (kind === 'secret') return 'unsafe'
  return isValidSupabaseUrl(url) && isBrowserSafeKey(kind) ? 'ready' : 'invalid'
}

export const supabaseConfigState = resolveState()
export const isSupabaseConfigured = supabaseConfigState === 'ready'
export const supabaseSettings = { url: url?.trim() ?? '', key: key?.trim() ?? '' }
