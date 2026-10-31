import type { SupabaseClient } from '@supabase/supabase-js'

import { createSupabaseClient } from '@/lib/supabase/client'

import { AdminError, toAdminError } from '../errors'

/** The admin's own client and session (separate from the customer app's). */
export function createBrowserClient(): SupabaseClient {
  return createSupabaseClient('jacobs.admin.session')
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
