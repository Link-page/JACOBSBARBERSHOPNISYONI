import type { SupabaseClient } from '@supabase/supabase-js'

import type { NotificationsApi } from './notifications-api'
import { vapidPublicKey } from './push-config'
import type { InboxItem } from './types'

type InboxRow = { id: string; category: InboxItem['category']; title: string; body: string; url: string | null; created_at: string; read_at: string | null }

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

/** Inbox, devices and preferences of the signed-in customer (RLS: own rows only). */
export function createSupabaseNotifications(db: SupabaseClient): NotificationsApi {
  return {
    pushAvailable: vapidPublicKey !== '',

    async listInbox() {
      const rows = check(await db.from('inbox_messages').select('id, category, title, body, url, created_at, read_at').order('created_at', { ascending: false }).limit(100))
      return (rows as InboxRow[]).map((r) => ({ id: r.id, category: r.category, title: r.title, body: r.body, url: r.url, createdAt: r.created_at, readAt: r.read_at }))
    },

    async markRead(ids) {
      check(await db.rpc('mark_inbox_read', { p_ids: ids ?? null }))
    },

    async savePushSubscription({ endpoint, keys }) {
      check(await db.rpc('save_push_subscription', { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_user_agent: navigator.userAgent }))
    },

    async removePushSubscription(endpoint) {
      check(await db.rpc('delete_push_subscription', { p_endpoint: endpoint }))
    },

    async getPreferences() {
      const row = check(await db.from('notification_preferences').select('reminders, shop_messages').maybeSingle<{ reminders: boolean; shop_messages: boolean }>())
      return { reminders: row?.reminders ?? true, shopMessages: row?.shop_messages ?? false }
    },

    async setPreferences({ reminders, shopMessages }) {
      check(await db.rpc('set_notification_preferences', { p_reminders: reminders, p_shop_messages: shopMessages }))
    },
  }
}
