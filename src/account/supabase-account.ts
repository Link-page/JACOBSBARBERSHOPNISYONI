import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeIlMobile } from '@/lib/phone'

import type { AccountApi } from './account-api'
import { toAccountError } from './errors'

type CustomerRow = { full_name: string; phone: string | null; created_at: string }

/**
 * Supabase Auth (email + password, email confirmation) plus the customer's own
 * record via register_customer (0010). Roles are never set from here: new
 * accounts are customers by database default.
 */
export function createSupabaseAccount(db: SupabaseClient, emailRedirectTo: string): AccountApi {
  async function completeProfile({ fullName, phone }: { fullName: string; phone: string }) {
    const { error } = await db.rpc('register_customer', { p_full_name: fullName, p_phone: phone })
    if (error) throw toAccountError(error)
  }

  return {
    requiresSignIn: true,

    async getState() {
      const { data } = await db.auth.getSession()
      const user = data.session?.user
      if (!user) return { status: 'signed-out' }
      const email = user.email ?? ''
      const { data: row, error } = await db.from('customers').select('full_name, phone, created_at').eq('profile_id', user.id).maybeSingle<CustomerRow>()
      if (error) throw toAccountError(error)
      if (row && row.phone && normalizeIlMobile(row.phone)) {
        return { status: 'ready', email, profile: { fullName: row.full_name, phone: row.phone, memberSince: row.created_at } }
      }
      // Details given at sign-up wait in the account's metadata until the email is confirmed.
      const meta = user.user_metadata as { full_name?: string; phone?: string }
      return { status: 'needs-profile', email, suggested: { fullName: row?.full_name ?? meta.full_name ?? '', phone: row?.phone ?? meta.phone ?? '' } }
    },

    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw toAccountError(error)
    },

    async signUp({ fullName, phone, email, password }) {
      const { data, error } = await db.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName, phone }, emailRedirectTo },
      })
      if (error) throw toAccountError(error)
      // With email confirmation on there is no session yet. (An address that already has an
      // account gets the same answer, so nobody can probe which emails are registered.)
      if (!data.session) return { needsConfirmation: true }
      await completeProfile({ fullName, phone })
      return { needsConfirmation: false }
    },

    completeProfile,

    async resendConfirmation(email) {
      const { error } = await db.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo } })
      if (error) throw toAccountError(error)
    },

    async signOut() {
      // 'local' clears this device's session even if the network call fails.
      await db.auth.signOut({ scope: 'local' })
    },

    subscribe(onChange) {
      // Deferred: Supabase must not be called from inside its own auth callback.
      const { data } = db.auth.onAuthStateChange(() => setTimeout(onChange, 0))
      return () => data.subscription.unsubscribe()
    },
  }
}
