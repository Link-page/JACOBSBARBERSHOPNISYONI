import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import type { BroadcastRecord, BroadcastResult } from '../types'
import { unwrap } from './client'

type HistoryRow = {
  id: string
  title: string
  body: string
  audience: BroadcastRecord['audience']
  created_at: string
  sender_name: string
  recipients: number
  push_accepted: number | string
  push_failed: number | string
  push_pending: number | string
}

/** Messages to customers (0014_broadcasts.sql): the database checks permission, consent and limits. */
export const createNotifications = (db: SupabaseClient): AdminApi['notifications'] => ({
  async send({ title, body, audience, link, idempotencyKey }) {
    return unwrap(
      await db.rpc('send_broadcast', { p_title: title, p_body: body, p_audience: audience, p_url: link, p_idempotency_key: idempotencyKey }),
    ) as BroadcastResult
  },

  async history() {
    const rows = unwrap(await db.rpc('broadcast_history', { p_limit: 50 })) as HistoryRow[]
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      audience: r.audience,
      createdAt: r.created_at,
      senderName: r.sender_name,
      recipients: r.recipients,
      pushAccepted: Number(r.push_accepted),
      pushFailed: Number(r.push_failed),
      pushPending: Number(r.push_pending),
    }))
  },
})
