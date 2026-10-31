/**
 * Push dispatch, independent of the runtime: the Edge Function wires in the
 * database and the sender; tests wire in fakes. No secrets live here.
 */

/** A due delivery, as returned by public.push_claim (0011). */
export type ClaimedDelivery = {
  delivery_id: string
  endpoint: string
  p256dh: string
  auth: string
  title: string
  body: string
  url: string | null
  category: string
  message_id: string
}

export type Outcome = 'sent' | 'retry' | 'gone' | 'failed'
export type PushResult = { outcome: Outcome; status?: number; error?: string }

export type DispatchDeps = {
  claim(limit: number): Promise<ClaimedDelivery[]>
  finish(deliveryId: string, result: PushResult): Promise<void>
  send(delivery: ClaimedDelivery, payload: string): Promise<PushResult>
}

export type DispatchSummary = { claimed: number } & Record<Outcome, number>

/**
 * Push service answer → what to do (RFC 8030 / 8292):
 * accepted → sent · 404/410 the subscription is gone · 429/5xx try again later ·
 * anything else (bad request, VAPID rejected, payload too large) won't improve by retrying.
 */
export function classifyStatus(status: number): Outcome {
  if (status >= 200 && status < 300) return 'sent'
  if (status === 404 || status === 410) return 'gone'
  if (status === 429 || status >= 500) return 'retry'
  return 'failed'
}

/** What the service worker receives. Small on purpose: push services cap payloads near 4 KB. */
export function buildPayload(delivery: ClaimedDelivery, appBase: string): string {
  return JSON.stringify({
    title: delivery.title,
    body: delivery.body,
    // Opens the app at the message's in-app link (relative '?go=…'), or the inbox.
    url: appBase + (delivery.url ?? '?go=notifications'),
    tag: delivery.message_id,
    category: delivery.category,
  })
}

/** Constant-time comparison for the shared dispatch secret. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Claims due deliveries in batches, sends each, and records the outcome. Bounded:
 * at most maxBatches × batchSize sends per run; the rest wait for the next run.
 * A send that throws (network trouble) is retried later, never lost.
 */
export async function runDispatch(
  deps: DispatchDeps,
  { appBase, batchSize = 100, maxBatches = 10, concurrency = 10 }: { appBase: string; batchSize?: number; maxBatches?: number; concurrency?: number },
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, retry: 0, gone: 0, failed: 0 }
  for (let batch = 0; batch < maxBatches; batch++) {
    const due = await deps.claim(batchSize)
    if (due.length === 0) break
    summary.claimed += due.length
    for (let i = 0; i < due.length; i += concurrency) {
      await Promise.all(
        due.slice(i, i + concurrency).map(async (delivery) => {
          let result: PushResult
          try {
            result = await deps.send(delivery, buildPayload(delivery, appBase))
          } catch (error) {
            result = { outcome: 'retry', error: String(error).slice(0, 300) }
          }
          await deps.finish(delivery.delivery_id, result)
          summary[result.outcome] += 1
        }),
      )
    }
    if (due.length < batchSize) break
  }
  return summary
}
