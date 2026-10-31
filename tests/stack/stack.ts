import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect } from 'vitest'

import { createSupabaseAdminApi } from '@/admin/data/supabase'
import type { AdminError } from '@/admin/data/errors'

/*
 * Helpers for tests against a LOCAL Supabase stack started by the Supabase CLI.
 * The service key here is the local stack's development key: it exists only in
 * the throwaway CI container and is used solely to create test accounts.
 */

export const stack = {
  url: process.env.STACK_API_URL ?? '',
  publishableKey: process.env.STACK_PUBLISHABLE_KEY || process.env.STACK_ANON_KEY || '',
  serviceKey: process.env.STACK_SERVICE_ROLE_KEY || process.env.STACK_SECRET_KEY || '',
}
export const stackAvailable = Boolean(stack.url && stack.publishableKey && stack.serviceKey)

export const JACOB = '11111111-1111-4111-8111-111111111111'
export const SERVICE = {
  signature: '22222222-0000-4000-8000-000000000001',
  fade: '22222222-0000-4000-8000-000000000002',
  beard: '22222222-0000-4000-8000-000000000004',
} as const

const options = { auth: { persistSession: false, autoRefreshToken: false } }
/** A browser-like client: publishable key, its own in-memory session. */
export const browserClient = () => createClient(stack.url, stack.publishableKey, options)
/** Test setup only (creating accounts, checking rows). */
export const serviceClient = () => createClient(stack.url, stack.serviceKey, options)

/** The local stack's email testing server (Mailpit), where confirmation emails land. */
export const mailpitUrl = process.env.STACK_MAILPIT_URL || process.env.STACK_INBUCKET_URL || 'http://127.0.0.1:54324'

export type Account = { id: string; email: string; password: string }
export type Session = { db: SupabaseClient; api: ReturnType<typeof createSupabaseAdminApi> }

const runId = Date.now().toString(36)
let counter = 0

/** Creates a confirmed account; the profile trigger makes it a customer, then the role is set. */
export async function createAccount(role: 'owner' | 'barber' | 'customer'): Promise<Account> {
  counter += 1
  const email = `${role}-${runId}-${counter}@stack.test`
  const password = `pw-${runId}-${counter}-${Math.random().toString(36).slice(2)}`
  const service = serviceClient()
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  if (role !== 'customer') {
    const { error: roleError } = await service.from('profiles').update({ role }).eq('id', data.user.id)
    if (roleError) throw new Error(`set role failed: ${roleError.message}`)
  }
  return { id: data.user.id, email, password }
}

/** The owner bootstrap from docs/admin.md: owner role + linked to Jacob's chair. */
export async function createOwner(): Promise<Account> {
  const owner = await createAccount('owner')
  const { error } = await serviceClient().from('barbers').update({ user_id: owner.id }).eq('id', JACOB)
  if (error) throw new Error(`link owner failed: ${error.message}`)
  return owner
}

/** Signs in through the real admin adapter, as the admin page does. */
export async function signIn(account: Account): Promise<Session> {
  const db = browserClient()
  const api = createSupabaseAdminApi(db)
  await api.auth.signIn(account.email, account.password)
  return { db, api }
}

export const anonymous = (): Session => {
  const db = browserClient()
  return { db, api: createSupabaseAdminApi(db) }
}

/** A Sunday 7–13 days ahead (+ extra weeks), as YYYY-MM-DD in local (shop) time. */
export function sunday(extraWeeks = 0) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 + extraWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString()

export async function expectAdminError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<AdminError>)
}
