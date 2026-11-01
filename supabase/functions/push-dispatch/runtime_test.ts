// Runs under Deno (the Edge Function's runtime) in CI — see .github/workflows/ci.yml.
// The Node tests in ../_shared cover the logic; this proves the real sender and its
// npm dependency work on Deno: a VAPID-signed aes128gcm push that decrypts again.
import { Buffer } from 'node:buffer'
import { createECDH, randomBytes } from 'node:crypto'
import ece from 'npm:http_ece@1.2.0'
import webpush from 'web-push'

import type { ClaimedDelivery } from '../_shared/dispatch-core.ts'
import { createWebPushSender } from '../_shared/web-push-sender.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** A browser's subscription keys, as PushManager would create them. */
function device() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  const auth = randomBytes(16)
  return { ecdh, auth, keys: { p256dh: b64url(ecdh.getPublicKey()), auth: b64url(auth) } }
}

const delivery = (keys: { p256dh: string; auth: string }): ClaimedDelivery =>
  ({ delivery_id: 'd1', message_id: 'm1', endpoint: 'https://push.example/abc', ...keys, category: 'waitlist_available', title: '', body: '', url: null, attempts: 1 }) as ClaimedDelivery

Deno.test('sends a VAPID-signed aes128gcm push that the device can decrypt', async () => {
  const vapid = webpush.generateVAPIDKeys()
  const phone = device()
  let sent: RequestInit | null = null
  const transport = (async (_url: string, init: RequestInit) => {
    sent = init
    return new Response('', { status: 201 })
  }) as unknown as typeof fetch
  const payload = JSON.stringify({ title: 'התפנה תור', body: 'יום ראשון 10:00' })

  const result = await createWebPushSender({ subject: 'mailto:test@example.com', ...vapid }, transport)(delivery(phone.keys), payload)

  assert(result.outcome === 'sent', `outcome ${result.outcome}`)
  const request = sent as RequestInit | null
  assert(request, 'nothing was sent')
  const headers = request.headers as Record<string, string>
  assert(/^vapid t=[^,]+, k=/.test(headers.Authorization), 'missing VAPID authorization')
  assert(headers['Content-Encoding'] === 'aes128gcm', 'wrong content encoding')
  assert(headers.TTL === '3600' && headers.Urgency === 'high', 'waiting-list pushes are short-lived and urgent')
  const clear = ece.decrypt(Buffer.from(request.body as Uint8Array), { version: 'aes128gcm', privateKey: phone.ecdh, authSecret: phone.auth }).toString('utf8')
  assert(clear === payload, 'the device could not decrypt the payload')
})

Deno.test('reports a device the push service no longer knows', async () => {
  const transport = (async () => new Response('gone', { status: 410 })) as unknown as typeof fetch
  const result = await createWebPushSender({ subject: 'mailto:test@example.com', ...webpush.generateVAPIDKeys() }, transport)(delivery(device().keys), '{}')
  assert(result.outcome === 'gone' && result.status === 410, `outcome ${result.outcome}`)
})
