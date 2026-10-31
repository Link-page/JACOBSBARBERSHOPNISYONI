import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { toAdminError } from '../errors'

/**
 * The browser only ever holds the project URL and the public anon key. Both are
 * safe to ship: every table is protected by Row Level Security, and privileged
 * work happens in database functions that check the caller's role.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined



let client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!url || !anonKey) throw toAdminError('not_configured')
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jacobs.admin.session' },
  })
  return client
}

/** Returns data or throws a translated AdminError. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAdminError(result.error)
  return result.data as T
}

/** Local day boundaries as ISO instants (the admin runs in the shop's time zone). */
export const dayStart = (date: string) => new Date(`${date}T00:00:00`).toISOString()
