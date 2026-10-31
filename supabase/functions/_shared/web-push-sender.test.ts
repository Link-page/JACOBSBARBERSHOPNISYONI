import { createECDH, randomBytes } from 'node:crypto'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createRequire } from 'node:module'
import webpush from 'web-push'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { ClaimedDelivery } from './dispatch-core.ts'
import { createWebPushSender } from './web-push-sender.ts'

// The encryption library web-push itself uses; here it plays the browser and decrypts.
const ece = createRequire(import.meta.url)('http_ece') as {
  decrypt(buffer: Buffer, params: { version: string; privateKey: ReturnType<typeof createECDH>; authSecret: string }): Buffer
}

/** A stand-in push service: answers by path, records what it received. */
const received: { path: string; headers: IncomingHttpHeaders; body: Buffer }[] = []
const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    received.push({ path: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) })
    const status = { '/ok': 201, '/gone': 410, '/busy': 503, '/bad': 400 }[req.url ?? ''] ?? 500
    res.writeHead(status).end()
  })
})
let base = ''
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

/** A browser's subscription keys (P-256 key pair + 16-byte auth secret). */
const browser = createECDH('prime256v1')
browser.generateKeys()
const authSecret = randomBytes(16).toString('base64url')
const vapid = { subject: 'mailto:owner@example.com', ...webpush.generateVAPIDKeys() }
const send = createWebPushSender(vapid)

const delivery = (path: string, category = 'appointment_reminder'): ClaimedDelivery => ({
  delivery_id: 'd1',
  endpoint: base + path,
  p256dh: browser.getPublicKey().toString('base64url'),
  auth: authSecret,
  title: 't',
  body: 'b',
  url: null,
  category,
  message_id: 'm1',
})

describe('web push sender (real web-push against a local push service)', () => {
  it('sends a VAPID-signed, aes128gcm-encrypted message only the browser can read', async () => {
    const payload = JSON.stringify({ title: 'תזכורת לתור', body: 'בעוד שעתיים' })
    expect(await send(delivery('/ok'), payload)).toEqual({ outcome: 'sent', status: 201 })
    const request = received.at(-1)!
    expect(request.headers.authorization).toMatch(/^vapid t=.+, k=/)
    expect(request.headers['content-encoding']).toBe('aes128gcm')
    expect(request.headers.ttl).toBe(String(2 * 60 * 60))
    expect(request.headers.urgency).toBe('high')
    expect(request.body.toString('utf8')).not.toContain('תזכורת')
    const decrypted = ece.decrypt(request.body, { version: 'aes128gcm', privateKey: browser, authSecret })
    expect(JSON.parse(decrypted.toString('utf8'))).toEqual({ title: 'תזכורת לתור', body: 'בעוד שעתיים' })
  })

  it('reports expired subscriptions, temporary trouble and permanent rejections', async () => {
    expect((await send(delivery('/gone'), '{}')).outcome).toBe('gone')
    expect((await send(delivery('/busy'), '{}')).outcome).toBe('retry')
    expect((await send(delivery('/bad'), '{}')).outcome).toBe('failed')
  })

  it('treats an unreachable push service as temporary', async () => {
    const result = await send({ ...delivery('/ok'), endpoint: 'http://127.0.0.1:1/unreachable' }, '{}')
    expect(result.outcome).toBe('retry')
  })

  it('keeps time-sensitive waiting-list news short-lived', async () => {
    await send(delivery('/ok', 'waitlist_available'), '{}')
    expect(received.at(-1)!.headers.ttl).toBe('3600')
    await send(delivery('/ok', 'shop_message'), '{}')
    expect(received.at(-1)!.headers).toMatchObject({ ttl: String(24 * 60 * 60), urgency: 'normal' })
  })
})
