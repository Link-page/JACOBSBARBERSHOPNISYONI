import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { AdminError, toAdminError } from '../errors'
import { supabaseSettings } from '../config'

/**
 * Browser client for the admin. It only ever holds the project URL and the
 * publishable key; Row Level Security and checked database functions decide
 * what each signed-in user may do.
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseSettings.url, supabaseSettings.key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jacobs.admin.session' },
  })
}

/** Returns data or throws a translated AdminError. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAdminError(result.error)
  return result.data as T
}

/**
 * For updates and deletes that return their rows. Row Level Security filters
 * forbidden rows out silently, so zero rows means the change did not happen.
 */
export function changedRows<T>(result: { data: T[] | null; error: unknown }): T[] {
  const rows = unwrap(result) ?? []
  if (rows.length === 0) throw new AdminError('forbidden')
  return rows
}

/** Local day boundaries as ISO instants (the admin runs in the shop's time zone). */
export const dayStart = (date: string) => new Date(`${date}T00:00:00`).toISOString()
