import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { unwrap } from './client'
import { toWaitlistEntry, type WaitlistRow } from './mappers'

const withCustomer = '*, customer:customers(full_name, phone)'

export const createWaitlist = (db: SupabaseClient): AdminApi['waitlist'] => ({
  async list({ from, to }) {
    const rows = unwrap(
      await db
        .from('waitlist_entries')
        .select(withCustomer)
        .gte('wanted_date', from)
        .lt('wanted_date', to)
        .eq('status', 'waiting')
        .order('wanted_date')
        .order('created_at')
        .returns<WaitlistRow[]>(),
    )
    return rows.map(toWaitlistEntry)
  },


  async remove(entryId) {
    unwrap(await db.rpc('remove_waitlist_entry', { p_entry: entryId }))
  },

  async runMaintenance() {
    return unwrap(await db.rpc('run_waitlist_maintenance')) as number
  },

})
