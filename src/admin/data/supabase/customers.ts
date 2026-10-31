import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { changedRows, unwrap } from './client'
import { toAppointment, toCustomer, type AppointmentRow, type CustomerRow } from './mappers'

const columns = 'id, full_name, phone, profile_id, created_at'

export const createCustomers = (db: SupabaseClient): AdminApi['customers'] => ({
  async search(query) {
    let request = db.from('customers').select(columns).order('full_name').limit(50)
    const q = query.trim().replace(/[%,()]/g, '')
    if (q) request = request.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    return unwrap(await request.returns<CustomerRow[]>()).map(toCustomer)
  },

  async get(id) {
    const [customer, appointments, notes] = await Promise.all([
      db.from('customers').select(columns).eq('id', id).single<CustomerRow>(),
      db
        .from('appointments')
        .select('*, customer:customers(full_name, phone)')
        .eq('customer_id', id)
        .order('starts_at', { ascending: false })
        .returns<AppointmentRow[]>(),
      db
        .from('customer_notes')
        .select('id, body, created_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .returns<{ id: string; body: string; created_at: string }[]>(),
    ])
    return {
      customer: toCustomer(unwrap(customer)),
      appointments: unwrap(appointments).map(toAppointment),
      notes: unwrap(notes).map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at })),
    }
  },

  async upsert(fullName, phone) {
    return toCustomer(unwrap(await db.rpc('staff_upsert_customer', { p_full_name: fullName, p_phone: phone }).single<CustomerRow>()))
  },

  async update(id, change) {
    const [row] = changedRows(
      await db.from('customers').update({ full_name: change.fullName, phone: change.phone }).eq('id', id).select(columns).returns<CustomerRow[]>(),
    )
    return toCustomer(row)
  },

  async addNote(customerId, body) {
    const { data } = await db.auth.getUser()
    unwrap(await db.from('customer_notes').insert({ customer_id: customerId, body, author_id: data.user?.id }))
  },
})
