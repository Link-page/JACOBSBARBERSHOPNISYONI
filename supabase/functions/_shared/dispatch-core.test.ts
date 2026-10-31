import { describe, expect, it } from 'vitest'

import { buildPayload, classifyStatus, runDispatch, safeEqual, type ClaimedDelivery, type PushResult } from './dispatch-core.ts'

const delivery = (n: number, category = 'appointment_reminder'): ClaimedDelivery => ({
  delivery_id: `d${n}`,
  endpoint: `https://push.test/${n}`,
  p256dh: 'p',
  auth: 'a',
  title: 'תזכורת לתור',
  body: 'יום ראשון 8.11 בשעה 12:00',
  url: `?go=appointment&id=${n}`,
  category,
  message_id: `m${n}`,
})

/** A fake queue with `total` due deliveries handed out in claim order. */
function fakeQueue(total: number, send: (d: ClaimedDelivery) => Promise<PushResult>) {
  const queue = Array.from({ length: total }, (_, i) => delivery(i + 1))
  const finished = new Map<string, PushResult>()
  return {
    finished,
    deps: {
      claim: async (limit: number) => queue.splice(0, limit),
      finish: async (id: string, result: PushResult) => void finished.set(id, result),
      send: (d: ClaimedDelivery) => send(d),
    },
  }
}

describe('push dispatch rules', () => {
  it('maps push service answers to outcomes', () => {
    expect([201, 202].map(classifyStatus)).toEqual(['sent', 'sent'])
    expect([404, 410].map(classifyStatus)).toEqual(['gone', 'gone'])
    expect([429, 500, 503].map(classifyStatus)).toEqual(['retry', 'retry', 'retry'])
    expect([400, 401, 403, 413].map(classifyStatus)).toEqual(['failed', 'failed', 'failed', 'failed'])
  })

  it('builds a small payload that opens the in-app link', () => {
    const payload = JSON.parse(buildPayload(delivery(7), 'https://app.test/'))
    expect(payload).toEqual({ title: 'תזכורת לתור', body: 'יום ראשון 8.11 בשעה 12:00', url: 'https://app.test/?go=appointment&id=7', tag: 'm7', category: 'appointment_reminder' })
    expect(JSON.parse(buildPayload({ ...delivery(1), url: null }, 'https://app.test/')).url).toBe('https://app.test/?go=notifications')
  })

  it('compares the dispatch secret in constant time', () => {
    expect(safeEqual('secret-value', 'secret-value')).toBe(true)
    expect(safeEqual('secret-value', 'secret-valuE')).toBe(false)
    expect(safeEqual('short', 'longer-value')).toBe(false)
  })
})

describe('runDispatch', () => {
  it('sends everything due in batches and records every outcome', async () => {
    const answers: Record<string, PushResult> = { d2: { outcome: 'gone', status: 410 }, d3: { outcome: 'retry', status: 503 } }
    const { deps, finished } = fakeQueue(5, async (d) => answers[d.delivery_id] ?? { outcome: 'sent', status: 201 })
    const summary = await runDispatch(deps, { appBase: 'https://app.test/', batchSize: 2 })
    expect(summary).toEqual({ claimed: 5, sent: 3, retry: 1, gone: 1, failed: 0 })
    expect(finished.size).toBe(5)
  })

  it('turns a thrown network error into a retry instead of losing the message', async () => {
    const { deps, finished } = fakeQueue(1, async () => {
      throw new Error('ECONNRESET')
    })
    const summary = await runDispatch(deps, { appBase: '' })
    expect(summary.retry).toBe(1)
    expect(finished.get('d1')).toMatchObject({ outcome: 'retry', error: expect.stringContaining('ECONNRESET') })
  })

  it('stops after maxBatches so one run is always bounded', async () => {
    let sends = 0
    const { deps } = fakeQueue(1000, async () => {
      sends++
      return { outcome: 'sent' }
    })
    const summary = await runDispatch(deps, { appBase: '', batchSize: 10, maxBatches: 3 })
    expect(summary.claimed).toBe(30)
    expect(sends).toBe(30)
  })
})
