import webpush from 'web-push'

import { classifyStatus, type ClaimedDelivery, type PushResult } from './dispatch-core.ts'

export type VapidConfig = { subject: string; publicKey: string; privateKey: string }

/** How long a push service should keep trying to reach the device: stale news is worse than none. */
const ttlSeconds: Record<string, number> = {
  waitlist_available: 60 * 60,
  appointment_reminder: 2 * 60 * 60,
  confirmation_required: 12 * 60 * 60,
}
const urgent = new Set(['waitlist_available', 'appointment_reminder', 'confirmation_required', 'appointment_cancelled'])

/**
 * Sends one encrypted Web Push message (aes128gcm, VAPID-signed) and classifies the
 * answer. web-push builds the request; standard fetch sends it (native in Deno and Node).
 */
export function createWebPushSender(vapid: VapidConfig, transport: typeof fetch = fetch) {
  return async function send(delivery: ClaimedDelivery, payload: string): Promise<PushResult> {
    try {
      const request = webpush.generateRequestDetails({ endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } }, payload, {
        vapidDetails: vapid,
        TTL: ttlSeconds[delivery.category] ?? 24 * 60 * 60,
        urgency: urgent.has(delivery.category) ? 'high' : 'normal',
        contentEncoding: 'aes128gcm',
      })
      const headers = Object.fromEntries(Object.entries(request.headers).map(([name, value]) => [name, String(value)]))
      const response = await transport(request.endpoint, { method: request.method, headers, body: request.body as BodyInit | null })
      const outcome = classifyStatus(response.status)
      return outcome === 'sent' ? { outcome, status: response.status } : { outcome, status: response.status, error: (await response.text()).slice(0, 300) }
    } catch (error) {
      // Unreachable push service, DNS, timeouts: temporary.
      return { outcome: 'retry', error: String(error).slice(0, 300) }
    }
  }
}
