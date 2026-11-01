import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { changedRows, unwrap } from './client'
import { toBarber, toService, type BarberRow, type ServiceRow } from './mappers'

const barberColumns =
  'id, name, bio, photo_path, whatsapp, active, sort_order, user_id, barber_services(service_id, duration_minutes), working_hours(weekday, start_time, end_time), breaks(weekday, start_time, end_time)'

/**
 * Which linked accounts may message customers (profiles.can_broadcast). Read
 * apart from the barbers themselves: profiles are private, so signed-out
 * callers — who may still read the public barber list — get none.
 */
async function broadcastPermissions(db: SupabaseClient, rows: BarberRow[]): Promise<Set<string>> {
  const ids = rows.map((r) => r.user_id).filter((id): id is string => id !== null)
  if (ids.length === 0 || !(await db.auth.getSession()).data.session) return new Set()
  const profiles = unwrap(await db.from('profiles').select('id, can_broadcast').in('id', ids).returns<{ id: string; can_broadcast: boolean }[]>())
  return new Set(profiles.filter((p) => p.can_broadcast).map((p) => p.id))
}

async function withPermissions(db: SupabaseClient, rows: BarberRow[]) {
  const allowed = await broadcastPermissions(db, rows)
  return rows.map((r) => toBarber(r, r.user_id !== null && allowed.has(r.user_id)))
}

export const createBarbers = (db: SupabaseClient): AdminApi['barbers'] => ({
  async list() {
    return withPermissions(db, unwrap(await db.from('barbers').select(barberColumns).order('sort_order').returns<BarberRow[]>()))
  },

  async save(barber) {
    const fields = { name: barber.name, bio: barber.bio, photo_path: barber.photoUrl, whatsapp: barber.whatsapp.replace(/\D/g, ''), active: barber.active, sort_order: barber.sortOrder }
    const [{ id }] = barber.id
      ? changedRows(await db.from('barbers').update(fields).eq('id', barber.id).select('id'))
      : [unwrap(await db.from('barbers').insert(fields).select('id').single<{ id: string }>())]
    unwrap(
      await db.rpc('admin_save_barber_schedule', {
        p_barber: id,
        p_services: barber.services.map((s) => ({ service_id: s.serviceId, duration_minutes: s.durationMinutes })),
        p_hours: barber.hours,
        p_breaks: barber.breaks,
      }),
    )
    const [saved] = await withPermissions(db, [unwrap(await db.from('barbers').select(barberColumns).eq('id', id).single<BarberRow>())])
    return saved
  },

  async setAccountRole(email, role, barberId) {
    unwrap(await db.rpc('admin_set_user_role', { p_email: email, p_role: role, p_barber: barberId }))
  },

  async setBroadcastPermission(userId, allowed) {
    unwrap(await db.rpc('admin_set_broadcast_permission', { p_profile: userId, p_allowed: allowed }))
  },
})

export const createServices = (db: SupabaseClient): AdminApi['services'] => ({
  async list() {
    const rows = unwrap(await db.from('services').select('*').order('sort_order').returns<ServiceRow[]>())
    return rows.map(toService)
  },

  async save(service, barberIds) {
    const fields = {
      name: service.name,
      description: service.description,
      duration_minutes: service.durationMinutes,
      price: service.price,
      active: service.active,
    }
    const [row] = service.id
      ? changedRows(await db.from('services').update(fields).eq('id', service.id).select('*').returns<ServiceRow[]>())
      : [unwrap(await db.from('services').insert({ ...fields, sort_order: 999 }).select('*').single<ServiceRow>())]
    unwrap(await db.rpc('admin_set_service_barbers', { p_service: row.id, p_barbers: barberIds }))
    return toService(row)
  },

  async reorder(ids) {
    unwrap(await db.rpc('reorder_services', { p_ids: ids }))
  },
})
