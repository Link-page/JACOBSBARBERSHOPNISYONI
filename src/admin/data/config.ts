/** Whether a Supabase project is configured for this build (no client code is loaded to check). */
export const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
