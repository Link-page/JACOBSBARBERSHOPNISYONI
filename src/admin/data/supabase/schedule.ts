import type { AdminApi } from '../admin-api'
import { dayStart, supabase, unwrap } from './client'
import { toBlock, type BlockRow } from './mappers'

export const schedule: AdminApi['schedule'] = {
  async daySlots(serviceId, date, barberId) {
    const rows = unwrap(
      await supabase().rpc('get_day_slots', { p_service: serviceId, p_date: date, p_barber: barberId ?? null }),
    ) as { starts_at: string; barber_ids: string[] }[]
    return rows.map((r) => ({ startsAt: r.starts_at, barberIds: r.barber_ids }))
  },

  async capacity(date) {
    const rows = unwrap(await supabase().rpc('staff_day_capacity', { p_date: date })) as {
      barber_id: string
      total_slots: number
      free_slots: number
    }[]
    return rows.map((r) => ({ barberId: r.barber_id, totalSlots: r.total_slots, freeSlots: r.free_slots }))
  },

  async blocks({ from, to }) {
    const rows = unwrap(
      await supabase()
        .from('time_blocks')
        .select('id, barber_id, starts_at, ends_at, reason')
        .lt('starts_at', dayStart(to))
        .gt('ends_at', dayStart(from))
        .order('starts_at')
        .returns<BlockRow[]>(),
    )
    return rows.map(toBlock)
  },

  async addBlock(block) {
    const row = unwrap(
      await supabase()
        .from('time_blocks')
        .insert({ barber_id: block.barberId, starts_at: block.startsAt, ends_at: block.endsAt, reason: block.reason })
        .select('id, barber_id, starts_at, ends_at, reason')
        .single<BlockRow>(),
    )
    return toBlock(row)
  },

  async removeBlock(id) {
    unwrap(await supabase().from('time_blocks').delete().eq('id', id))
  },
}
