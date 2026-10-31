import type { AdminApi } from '../admin-api'
import type { OutboxMessage } from '../types'
import { supabase, unwrap } from './client'
import { toWaitlistEntry, type WaitlistRow } from './mappers'

const withCustomer = '*, customer:customers(full_name, phone)'

export const waitlist: AdminApi['waitlist'] = {
  async list({ from, to }) {
    const rows = unwrap(
      await supabase()
        .from('waitlist_entries')
        .select(withCustomer)
        .gte('wanted_date', from)
        .lt('wanted_date', to)
        .in('status', ['waiting', 'offered'])
        .order('wanted_date')
        .order('created_at')
        .returns<WaitlistRow[]>(),
    )
    return rows.map(toWaitlistEntry)
  },

  async offer(entryId, startsAt, barberId) {
    const row = unwrap(
      await supabase()
        .rpc('staff_offer_waitlist_slot', { p_entry: entryId, p_starts_at: startsAt, p_barber: barberId })
        .single<WaitlistRow>(),
    )
    return toWaitlistEntry(row)
  },

  async remove(entryId) {
    unwrap(await supabase().rpc('remove_waitlist_entry', { p_entry: entryId }))
  },

  async runMaintenance() {
    return unwrap(await supabase().rpc('run_waitlist_maintenance')) as number
  },

  async outbox() {
    const rows = unwrap(
      await supabase()
        .from('notifications')
        .select('id, waitlist_entry_id, channel, status, message, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<
          { id: string; waitlist_entry_id: string | null; channel: OutboxMessage['channel']; status: OutboxMessage['status']; message: string; created_at: string }[]
        >(),
    )
    return rows.map((r) => ({
      id: r.id,
      waitlistEntryId: r.waitlist_entry_id,
      channel: r.channel,
      status: r.status,
      message: r.message,
      createdAt: r.created_at,
    }))
  },
}
