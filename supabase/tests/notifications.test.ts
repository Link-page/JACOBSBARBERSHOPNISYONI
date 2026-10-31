import type pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { anon, createUser, errorOf, isolated, pool, queryAs, type Actor } from './harness'

afterAll(() => pool.end())

const save = `select public.save_push_subscription($1, $2, $3, 'test-agent')`
const keys = ['k'.repeat(60), 'a'.repeat(16)]

/** Runs a query as the service role (the push-dispatch Edge Function). */
async function asService<T extends pg.QueryResultRow = pg.QueryResultRow>(db: pg.PoolClient, sql: string, params: unknown[] = []) {
  await db.query('savepoint svc')
  await db.query('set local role service_role')
  try {
    const result = await db.query<T>(sql, params)
    await db.query('release savepoint svc')
    return result
  } catch (error) {
    await db.query('rollback to savepoint svc')
    throw error
  } finally {
    await db.query('reset role')
  }
}

/** One inbox message for `who` with a push queued to each of their devices. */
const message = (db: pg.PoolClient, who: Actor, dedupe: string, category = 'shop_message') =>
  db.query(`select app.notify($1, $2::public.notification_category, 'כותרת', 'גוף ההודעה', null, $3) as id`, [who.id, category, dedupe]).then((r) => r.rows[0].id as string | null)

describe('devices and the inbox', () => {
  it('stores a device per account, moves it on a new sign-in, and lets only its owner remove it', async () => {
    await isolated(async (db) => {
      const [a, b] = [await createUser(db), await createUser(db)]
      await queryAs(db, a, save, ['https://push.test/device-1', ...keys])
      await queryAs(db, a, save, ['https://push.test/device-2', ...keys])
      expect((await queryAs(db, a, `select count(*)::int as n from public.push_subscriptions`)).rows[0].n).toBe(2)
      expect((await queryAs(db, b, `select count(*)::int as n from public.push_subscriptions`)).rows[0].n).toBe(0) // RLS

      // The same browser signs in as someone else: the device follows the current account.
      await queryAs(db, b, save, ['https://push.test/device-1', ...keys])
      const owner = await db.query(`select profile_id from public.push_subscriptions where endpoint = 'https://push.test/device-1'`)
      expect(owner.rows[0].profile_id).toBe(b.id)

      await queryAs(db, a, `select public.delete_push_subscription('https://push.test/device-1')`) // not a's any more
      expect((await db.query(`select count(*)::int as n from public.push_subscriptions`)).rows[0].n).toBe(2)
      expect(await errorOf(queryAs(db, anon, save, ['https://push.test/x', ...keys]))).toMatch(/permission denied/)
      expect(await errorOf(queryAs(db, a, save, ['http://not-https.test/x', ...keys]))).toMatch(/check constraint/)
    })
  })

  it('shows each person only their own messages and de-duplicates by key', async () => {
    await isolated(async (db) => {
      const [a, b] = [await createUser(db), await createUser(db)]
      expect(await message(db, a, 'once')).not.toBeNull()
      expect(await message(db, a, 'once')).toBeNull()
      await message(db, b, 'other')
      expect((await queryAs(db, a, `select count(*)::int as n from public.inbox_messages`)).rows[0].n).toBe(1)
      expect((await queryAs(db, b, `select public.mark_inbox_read() as n`)).rows[0].n).toBe(1)
      expect((await queryAs(db, a, `select count(*)::int as n from public.inbox_messages where read_at is null`)).rows[0].n).toBe(1)
    })
  })

  it('respects the reminder preference for pushes (the inbox still gets the reminder)', async () => {
    await isolated(async (db) => {
      const a = await createUser(db)
      await queryAs(db, a, save, ['https://push.test/a', ...keys])
      await queryAs(db, a, `select public.set_notification_preferences(false, false)`)
      await message(db, a, 'reminder-1', 'appointment_reminder')
      await message(db, a, 'request-1', 'confirmation_required')
      const deliveries = await db.query(`select m.category from public.push_deliveries d join public.inbox_messages m on m.id = d.message_id`)
      expect(deliveries.rows.map((r) => r.category)).toEqual(['confirmation_required'])
      expect((await queryAs(db, a, `select count(*)::int as n from public.inbox_messages`)).rows[0].n).toBe(2)
    })
  })
})

describe('push dispatch (service role only)', () => {
  it('is closed to customers', async () => {
    await isolated(async (db) => {
      const a = await createUser(db)
      expect(await errorOf(queryAs(db, a, `select * from public.push_claim(10)`))).toMatch(/permission denied/)
      expect(await errorOf(queryAs(db, a, `select public.push_finish(gen_random_uuid(), 'sent')`))).toMatch(/permission denied/)
    })
  })

  it('claims each due delivery once, retries with back-off, gives up after 5 attempts, and forgets expired devices', async () => {
    await isolated(async (db) => {
      const [a, b] = [await createUser(db), await createUser(db)]
      await queryAs(db, a, save, ['https://push.test/a', ...keys])
      await queryAs(db, b, save, ['https://push.test/b', ...keys])
      await message(db, a, 'for-a')
      await message(db, b, 'for-b')

      const claimed = (await asService(db, `select * from public.push_claim(10)`)).rows
      expect(claimed.map((r) => r.endpoint).sort()).toEqual(['https://push.test/a', 'https://push.test/b'])
      expect(claimed[0]).toMatchObject({ title: 'כותרת', body: 'גוף ההודעה' })
      expect((await asService(db, `select * from public.push_claim(10)`)).rows).toHaveLength(0) // leased

      const forA = claimed.find((r) => r.endpoint.endsWith('/a'))!.delivery_id
      const forB = claimed.find((r) => r.endpoint.endsWith('/b'))!.delivery_id
      await asService(db, `select public.push_finish($1, 'sent', 201)`, [forA])
      await asService(db, `select public.push_finish($1, 'sent', 201)`, [forA]) // idempotent
      expect((await db.query(`select status, sent_at from public.push_deliveries where id = $1`, [forA])).rows[0].status).toBe('sent')

      // Temporary failures back off, then give up after the fifth attempt.
      for (let attempt = 1; attempt <= 5; attempt++) {
        await db.query(`update public.push_deliveries set next_attempt_at = now() - interval '1 second' where id = $1`, [forB])
        if (attempt > 1) expect((await asService(db, `select * from public.push_claim(10)`)).rows).toHaveLength(1)
        await asService(db, `select public.push_finish($1, 'retry', 503, 'unavailable')`, [forB])
      }
      expect((await db.query(`select status, attempts from public.push_deliveries where id = $1`, [forB])).rows[0]).toEqual({ status: 'failed', attempts: 5 })

      // A device the push service no longer knows (410) is forgotten; the failure stays countable.
      await message(db, a, 'for-a-again')
      const [next] = (await asService(db, `select * from public.push_claim(10)`)).rows
      await asService(db, `select public.push_finish($1, 'gone', 410)`, [next.delivery_id])
      expect((await db.query(`select count(*)::int as n from public.push_subscriptions where endpoint = 'https://push.test/a'`)).rows[0].n).toBe(0)
      expect((await db.query(`select status, last_error from public.push_deliveries where id = $1`, [next.delivery_id])).rows[0]).toEqual({ status: 'failed', last_error: 'subscription_gone' })
    })
  })

  it('reclaims a delivery whose dispatcher crashed mid-send', async () => {
    await isolated(async (db) => {
      const a = await createUser(db)
      await queryAs(db, a, save, ['https://push.test/a', ...keys])
      await message(db, a, 'crash')
      const [first] = (await asService(db, `select * from public.push_claim(10)`)).rows
      await db.query(`update public.push_deliveries set locked_until = now() - interval '1 second' where id = $1`, [first.delivery_id])
      const [again] = (await asService(db, `select * from public.push_claim(10)`)).rows
      expect(again.delivery_id).toBe(first.delivery_id)
    })
  })
})
