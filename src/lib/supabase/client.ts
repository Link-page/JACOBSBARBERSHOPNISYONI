import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { supabaseSettings } from './config'

/**
 * A browser client holding only the project URL and the publishable key;
 * Row Level Security and checked database functions decide what each user may do.
 * Each app keeps its own session (`storageKey`), so signing in to the admin
 * never signs anyone in to the customer app, or the reverse.
 */
export function createSupabaseClient(storageKey: string): SupabaseClient {
  return createClient(supabaseSettings.url, supabaseSettings.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey },
  })
}
