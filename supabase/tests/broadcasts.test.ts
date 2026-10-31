import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { anon, createBarber, createOwner, createUser, errorOf, isolated, pool, queryAs, type Actor } from './harness'

afterAll(() => pool.end())

const send = `select public.send_broadcast($1, $2, $3, $4, $5) as r`
const optIn = (db: pg.PoolClient, who: Actor) => queryAs(db, who, `select public.set_notification_preferences(true, true)`)
const received = (db: pg.PoolClient, broadcast: string) =>
  db.query(`select profile_id from public.inbox_messages where broadcast_id = $1 order by profile_id`, [broadcast]).then((r) => r.rows.map((x) => x.profile_id))
/** Lets the next send through the 2-minute spacing (tests don't wait). */
const ageBroadcasts = (db: pg.PoolClient) => db.query(`update public.broadcasts set created_at = created_at - interval '3 minutes'`)

/** A booked appointment in the next few days for `customer` with `barber` (inserted directly). */
async function upcoming(db: pg.PoolClient, customer: Actor, barber: string) {
  const { rows } = await db.query(`insert into public.customers (profile_id, full_name) values ($1, 'לקוח') returning id`, [customer.id])
  await db.query(
    `insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price)
     values ($1, $2, $3, now() + interval '2 days', now() + interval '2 days 45 minutes', 90)`,
    [rows[0].id, barber, SERVICE.signature],
  )
}

describe('messages from the shop', () => {
  it('reach only customers who opted in, once per send, with counts for the owner', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      const [yes, no] = [await createUser(db), await createUser(db)]
      await optIn(db, yes)
      await db.query(`insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth) values ($1, 'https://push.test/yes', repeat('k', 60), repeat('a', 16))`, [yes.id])

      const key = randomUUID()
      const first = (await queryAs(db, owner, send, ['סגור מחר', 'המספרה סגורה מחר בגלל החג.', 'opted_in', null, key])).rows[0].r
      expect(first).toMatchObject({ recipients: 1, duplicate: false })
      expect(await received(db, first.id)).toEqual([yes.id])
      expect(await received(db, first.id)).not.toContain(no.id)

      // A double submit returns the first send and sends nothing more.
      const again = (await queryAs(db, owner, send, ['סגור מחר', 'המספרה סגורה מחר בגלל החג.', 'opted_in', null, key])).rows[0].r
      expect(again).toMatchObject({ id: first.id, duplicate: true })
      expect(await received(db, first.id)).toHaveLength(1)

      const history = (await queryAs(db, owner, `select * from public.broadcast_history()`)).rows
      expect(history[0]).toMatchObject({ id: first.id, recipients: 1 })
      expect(Number(history[0].push_pending)).toBe(1) // queued for the device; "accepted" only once the push service takes it
    })
  })

  it('limits pace and repetition, and accepts only in-app links', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      await queryAs(db, owner, send, ['שלום', 'הודעה ראשונה', 'opted_in', null, randomUUID()])
      expect(await errorOf(queryAs(db, owner, send, ['שלום', 'הודעה שנייה', 'opted_in', null, randomUUID()]))).toBe('broadcast_too_soon')
      await ageBroadcasts(db)
      expect(await errorOf(queryAs(db, owner, send, ['שלום', 'הודעה ראשונה', 'opted_in', null, randomUUID()]))).toBe('duplicate_broadcast')
      expect(await errorOf(queryAs(db, owner, send, ['קישור', 'לחצו כאן', 'opted_in', 'https://evil.example', randomUUID()]))).toBe('invalid_broadcast')
      expect(await errorOf(queryAs(db, owner, send, ['', 'ריק', 'opted_in', null, randomUUID()]))).toBe('invalid_broadcast')
    })
  })

  it('refuses customers, anonymous callers and barbers the owner has not authorised', async () => {
    await isolated(async (db) => {
      const customer = await createUser(db)
      const { user: barber } = await createBarber(db)
      expect(await errorOf(queryAs(db, customer, send, ['x', 'y', 'opted_in', null, randomUUID()]))).toBe('forbidden')
      expect(await errorOf(queryAs(db, barber, send, ['x', 'y', 'opted_in', null, randomUUID()]))).toBe('forbidden')
      expect(await errorOf(queryAs(db, anon, send, ['x', 'y', 'opted_in', null, randomUUID()]))).toMatch(/permission denied/)
      expect(await errorOf(queryAs(db, customer, `select * from public.broadcast_history()`))).toBe('forbidden')
      // Nobody can grant themselves the permission.
      expect(await errorOf(queryAs(db, barber, `select public.admin_set_broadcast_permission($1, true)`, [barber.id]))).toBe('forbidden')
      expect(await errorOf(queryAs(db, barber, `update public.profiles set can_broadcast = true where id = $1`, [barber.id]))).toMatch(/permission denied/)
    })
  })

  it('lets an authorised barber notify only their own upcoming customers, and see only their own history', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      const { user: barber, barberId } = await createBarber(db)
      await queryAs(db, owner, `select public.admin_set_broadcast_permission($1, true)`, [barber.id])
      const [mine, jacobs] = [await createUser(db), await createUser(db)]
      await upcoming(db, mine, barberId)
      await upcoming(db, jacobs, JACOB)

      const sent = (await queryAs(db, barber, send, ['איחור קטן', 'אני מאחר ברבע שעה היום.', 'upcoming', null, randomUUID()])).rows[0].r
      expect(await received(db, sent.id)).toEqual([mine.id])

      await ageBroadcasts(db)
      await queryAs(db, owner, send, ['הודעת בעלים', 'לכל הלקוחות הקרובים', 'upcoming', null, randomUUID()])
      const barberHistory = (await queryAs(db, barber, `select id from public.broadcast_history()`)).rows
      expect(barberHistory.map((r) => r.id)).toEqual([sent.id])
      expect((await queryAs(db, owner, `select id from public.broadcast_history()`)).rows).toHaveLength(2)
    })
  })
})
