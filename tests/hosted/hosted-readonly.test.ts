import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSupabaseAdminApi } from '@/admin/data/supabase'

/*
 * Read-only checks against the HOSTED project, as an anonymous visitor using the
 * same publishable key the website ships. Nothing is written. Signed-in owner
 * features are not tested here (that would need real credentials).
 */

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const JACOB = '11111111-1111-4111-8111-111111111111'
const NIL = '00000000-0000-0000-0000-000000000000'

describe.skipIf(!url || !key)('hosted Supabase project (anonymous, read-only)', () => {
  // Created in beforeAll: describe bodies also run when skipped, and an empty URL would throw.
  let db: SupabaseClient
  let api: ReturnType<typeof createSupabaseAdminApi>
  beforeAll(() => {
    db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    api = createSupabaseAdminApi(db)
  })

  // Run first: when the project is behind the code, this names what to run instead of failing obscurely below.
  it('has the migrations this code needs (0011–0015)', async () => {
    // A function only these migrations add: "permission denied" (42501) = installed, PGRST202 = missing.
    const markers: [string, string, Record<string, unknown>][] = [
      ['0011_notifications.sql', 'save_push_subscription', { p_endpoint: 'https://x.invalid', p_p256dh: '', p_auth: '' }],
      ['0012_attendance.sql', 'confirm_attendance', { p_id: NIL }],
      ['0014_broadcasts.sql', 'send_broadcast', { p_title: '', p_body: '', p_audience: '', p_url: null, p_idempotency_key: NIL }],
    ]
    const missing: string[] = []
    for (const [migration, fn, args] of markers) {
      const { error } = await db.rpc(fn, args)
      if (error?.code === 'PGRST202') missing.push(migration)
    }
    // 0016 removes the table privileges Supabase grants by default: an anonymous read must be refused, not just empty.
    const inbox = await db.from('inbox_messages').select('id').limit(1)
    if (!missing.includes('0011_notifications.sql') && inbox.error?.code !== '42501') missing.push('0016_notification_table_grants.sql')
    // 0013 and 0015 only replace functions; they can't be seen anonymously (see docs/notifications.md for the SQL check).
    expect(missing, 'Run these migrations in the Supabase SQL Editor, in order, together with 0013 and 0015 (docs/notifications.md)').toEqual([])
  })

  it('serves the public catalogue from the seed', async () => {
    expect(await api.auth.getState()).toEqual({ status: 'signed-out' })
    const services = await api.services.list()
    expect(services.length).toBeGreaterThan(0)
    expect(services.every((s) => s.active)).toBe(true)
    const jacob = (await api.barbers.list()).find((b) => b.id === JACOB)
    expect(jacob).toMatchObject({ active: true })
    expect(jacob!.hours.length).toBeGreaterThan(0)
    expect((await api.settings.get()).name.length).toBeGreaterThan(0)
  })

  it('answers availability for the current month', async () => {
    const [service] = await api.services.list()
    const today = new Date()
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const { data, error } = await db.rpc('get_month_availability', { p_service: service.id, p_month: month })
    expect(error).toBeNull()
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    expect(data).toHaveLength(days)
    for (const row of data as { status: string }[]) expect(['available', 'full', 'closed', 'past', 'unavailable']).toContain(row.status)
  })

  it('denies anonymous access to every private table', async () => {
    for (const table of [
      'customers', 'appointments', 'profiles', 'customer_notes', 'waitlist_entries', 'notifications', 'audit_log', 'time_blocks',
      'push_subscriptions', 'notification_preferences', 'notification_events', 'inbox_messages', 'push_deliveries', 'broadcasts',
    ]) {
      const { error } = await db.from(table).select('*').limit(1)
      expect(error?.code, table).toBe('42501')
    }
  })

  it('has every staff and customer function installed, and closed to anonymous callers', async () => {
    // 42501 = exists but not permitted. A missing function (unapplied migration) returns PGRST202 instead.
    const calls: [string, Record<string, unknown>][] = [
      ['book_appointment', { p_service: NIL, p_starts_at: new Date().toISOString() }],
      ['join_waitlist', { p_service: NIL, p_date: '2030-01-01' }],
      ['claim_waitlist_offer', { p_entry: NIL }],
      ['cancel_appointment', { p_id: NIL }],
      ['staff_create_appointment', { p_customer: NIL, p_barber: NIL, p_service: NIL, p_starts_at: new Date().toISOString() }],
      ['staff_upsert_customer', { p_full_name: 'x' }],
      ['staff_day_capacity', { p_date: '2030-01-01' }],
      ['run_waitlist_maintenance', {}],
      ['get_appointment_history', { p_id: NIL }],
      ['admin_set_user_role', { p_email: 'x@example.invalid', p_role: 'owner' }],
      ['reorder_services', { p_ids: [] }],
      ['admin_save_barber_schedule', { p_barber: NIL, p_services: [], p_hours: [], p_breaks: [] }],
      ['admin_set_service_barbers', { p_service: NIL, p_barbers: [] }],
      ['confirm_attendance', { p_id: NIL }],
      ['save_push_subscription', { p_endpoint: 'https://x.invalid', p_p256dh: '', p_auth: '' }],
      ['delete_push_subscription', { p_endpoint: 'https://x.invalid' }],
      ['mark_inbox_read', { p_ids: null }],
      ['set_notification_preferences', { p_reminders: true, p_shop_messages: false }],
      ['send_broadcast', { p_title: '', p_body: '', p_audience: '', p_url: null, p_idempotency_key: NIL }],
      ['broadcast_history', { p_limit: 1 }],
      ['admin_set_broadcast_permission', { p_profile: NIL, p_allowed: true }],
      ['push_claim', { p_limit: 1 }],
      ['push_finish', { p_delivery: NIL, p_outcome: 'sent' }],
    ]
    for (const [fn, args] of calls) {
      const { error } = await db.rpc(fn, args)
      expect(error?.code, fn).toBe('42501')
    }
  })

  it('rejects sign-in with wrong credentials', async () => {
    const { error } = await db.auth.signInWithPassword({ email: `nobody-${Date.now()}@example.invalid`, password: 'not-the-password' })
    expect(error).not.toBeNull()
  })
})
