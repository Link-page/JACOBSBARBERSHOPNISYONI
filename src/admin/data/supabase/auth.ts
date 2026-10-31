import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { toAdminError } from '../errors'
import { unwrap } from './client'

/** Email + password sign-in through Supabase Auth; the role comes from the database. */
export const createAuth = (db: SupabaseClient): AdminApi['auth'] => ({
  async getState() {
    const { data } = await db.auth.getSession()
    const user = data.session?.user
    if (!user) return { status: 'signed-out' }
    const profile = unwrap(
      await db.from('profiles').select('full_name, role, can_broadcast').eq('id', user.id).maybeSingle<{ full_name: string; role: string; can_broadcast: boolean }>(),
    )
    if (!profile || (profile.role !== 'owner' && profile.role !== 'barber')) {
      return { status: 'not-staff', email: user.email ?? '' }
    }
    const chair = unwrap(await db.from('barbers').select('id, name').eq('user_id', user.id).maybeSingle<{ id: string; name: string }>())
    return {
      status: 'staff',
      staff: {
        userId: user.id,
        email: user.email ?? '',
        // Accounts created in the dashboard have no name: fall back to the barber's name.
        name: profile.full_name || chair?.name || user.email || '',
        role: profile.role,
        barberId: chair?.id ?? null,
        canBroadcast: profile.role === 'owner' || profile.can_broadcast === true,
      },
    }
  },

  async signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw toAdminError(error)
  },

  async signOut() {
    // 'local' clears this device's session even if the network call fails.
    await db.auth.signOut({ scope: 'local' })
  },

  subscribe(onChange) {
    const { data } = db.auth.onAuthStateChange(() => onChange())
    return () => data.subscription.unsubscribe()
  },
})
