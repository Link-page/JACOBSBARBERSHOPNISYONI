import type { AdminApi } from '../admin-api'
import { toAdminError } from '../errors'
import { supabase, unwrap } from './client'

/** Email + password sign-in through Supabase Auth; the role comes from the database. */
export const auth: AdminApi['auth'] = {
  async getState() {
    const { data } = await supabase().auth.getSession()
    const user = data.session?.user
    if (!user) return { status: 'signed-out' }
    const profile = unwrap(
      await supabase().from('profiles').select('full_name, role').eq('id', user.id).maybeSingle<{ full_name: string; role: string }>(),
    )
    if (!profile || (profile.role !== 'owner' && profile.role !== 'barber')) {
      return { status: 'not-staff', email: user.email ?? '' }
    }
    const chair = unwrap(await supabase().from('barbers').select('id').eq('user_id', user.id).maybeSingle<{ id: string }>())
    return {
      status: 'staff',
      staff: {
        userId: user.id,
        email: user.email ?? '',
        name: profile.full_name || user.email || '',
        role: profile.role,
        barberId: chair?.id ?? null,
      },
    }
  },

  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw toAdminError(error)
  },

  async signOut() {
    // 'local' clears this device's session even if the network call fails.
    await supabase().auth.signOut({ scope: 'local' })
  },

  subscribe(onChange) {
    const { data } = supabase().auth.onAuthStateChange(() => onChange())
    return () => data.subscription.unsubscribe()
  },
}
