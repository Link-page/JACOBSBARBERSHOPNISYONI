import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { at, createOwner, createUser, errorOf, isolated, nextWorkingSunday, pool, queryAs, slotTimes } from './harness'

afterAll(() => pool.end())

const book = `select * from public.book_appointment($1, $2::timestamptz, $3, $4, $5)`
const join = `select public.join_waitlist($1, $2::date, $3, $4, $5) as result`

/** Leaves only 10:00–10:45 open on `day`, then books it — the day is full. */
async function fillDay(db: Parameters<Parameters<typeof isolated>[0]>[0], day: string) {
  await db.query(`insert into public.time_blocks (barber_id, starts_at, ends_at) values ($1, $2, $3), ($1, $4, $5)`, [
    JACOB,
    await at(db, day, '09:00'),
    await at(db, day, '10:00'),
    await at(db, day, '10:45'),
    await at(db, day, '20:00'),
  ])
  const first = await createUser(db)
  const { rows } = await queryAs(db, first, book, [SERVICE.signature, await at(db, day, '10:00'), null, 'מחזיק התור', null])
  return { first, appointmentId: rows[0].id as string }
}

describe('waiting list', () => {
  it('only accepts requests for a full day, once per customer', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const customer = await createUser(db)
      expect(await errorOf(queryAs(db, customer, join, [SERVICE.signature, day, null, 'מחכה', null]))).toBe('slots_available')
      await fillDay(db, day)
      const first = await queryAs(db, customer, join, [SERVICE.signature, day, null, 'מחכה', null])
      const again = await queryAs(db, customer, join, [SERVICE.signature, day, null, 'מחכה', null])
      expect(first.rows[0].result.already_on_list).toBe(false)
      expect(again.rows[0].result.already_on_list).toBe(true)
      expect(again.rows[0].result.entry.id).toBe(first.rows[0].result.entry.id)
    })
  })

  it('notifies waiting customers when an unconfirmed appointment is auto-cancelled', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const { appointmentId } = await fillDay(db, day)
      const waiting = await createUser(db)
      await queryAs(db, waiting, join, [SERVICE.signature, day, null, 'ממתין', null])
      const { rows } = await db.query(`select confirmation_status, confirmation_deadline from public.appointments where id = $1`, [appointmentId])
      expect(rows[0].confirmation_status).toBe('pending')

      const afterDeadline = new Date(rows[0].confirmation_deadline.getTime() + 60_000)
      expect((await db.query(`select app.run_scheduler($1::timestamptz) as r`, [afterDeadline])).rows[0].r.cancelled).toBe(1)
      const inbox = await db.query(`select category from public.inbox_messages where profile_id = $1`, [waiting.id])
      expect(inbox.rows.map((r) => r.category)).toEqual(['waitlist_available'])
      expect(await slotTimes(db, SERVICE.signature, day)).toContain('10:00')
    })
  })

  it('notifies every eligible waiting customer when time frees up, and holds nothing', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const { first, appointmentId } = await fillDay(db, day)
      const [early, late, tooLong] = [await createUser(db), await createUser(db), await createUser(db)]
      await queryAs(db, early, join, [SERVICE.signature, day, null, 'ממתין ראשון', null])
      await queryAs(db, late, join, [SERVICE.signature, day, null, 'ממתין שני', null])
      // 70 minutes can't fit in the 45 that will free up: not eligible.
      await queryAs(db, tooLong, join, [SERVICE.cutBeard, day, null, 'טיפול ארוך', null])
      await db.query(`insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth) values ($1, 'https://push.test/early', repeat('k', 60), repeat('a', 16))`, [early.id])

      await queryAs(db, first, `select * from public.cancel_appointment($1)`, [appointmentId])

      const notified = await db.query(`select profile_id from public.inbox_messages where category = 'waitlist_available' order by profile_id`)
      expect(notified.rows.map((r) => r.profile_id).sort()).toEqual([early.id, late.id].sort())
      expect((await db.query(`select count(*)::int as n from public.push_deliveries`)).rows[0].n).toBe(1)
      // Nothing is held: everyone still waits, and the time is open to anyone.
      const statuses = await queryAs(db, owner, `select distinct status from public.waitlist_entries`)
      expect(statuses.rows.map((r) => r.status)).toEqual(['waiting'])
      expect(await slotTimes(db, SERVICE.signature, day)).toContain('10:00')

      // Announcing the same freed time again notifies nobody twice.
      const again = await db.query(`select app.announce_freed_time($1, $2, $3, $4) as n`, [appointmentId, JACOB, await at(db, day, '10:00'), await at(db, day, '10:45')])
      expect(again.rows[0].n).toBe(0)
      expect((await db.query(`select count(*)::int as n from public.inbox_messages where category = 'waitlist_available'`)).rows[0].n).toBe(2)

      // The first to book wins; the other is told the time is taken.
      const start = await at(db, day, '10:00')
      await queryAs(db, late, book, [SERVICE.signature, start, null, null, null])
      expect(await errorOf(queryAs(db, early, book, [SERVICE.signature, start, null, null, null]))).toBe('slot_unavailable')
      const lateEntry = await db.query(`select w.status from public.waitlist_entries w join public.customers c on c.id = w.customer_id where c.profile_id = $1`, [late.id])
      expect(lateEntry.rows[0].status).toBe('booked') // booking the day they waited for takes them off the list
    })
  })

  it('retires exclusive offers and holds', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      await fillDay(db, day)
      const waiting = await createUser(db)
      const entry = (await queryAs(db, waiting, join, [SERVICE.signature, day, null, 'ממתין', null])).rows[0].result.entry.id
      expect(await errorOf(queryAs(db, waiting, `select public.claim_waitlist_offer($1)`, [entry]))).toBe('offers_retired')
      expect(await errorOf(queryAs(db, owner, `select public.staff_offer_waitlist_slot($1, $2::timestamptz, $3)`, [entry, await at(db, day, '10:00'), JACOB]))).toBe('offers_retired')
    })
  })

  it('lets the customer or responsible staff remove a request, and nobody else', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      await fillDay(db, day)
      const [customer, stranger] = [await createUser(db), await createUser(db)]
      const { rows } = await queryAs(db, customer, join, [SERVICE.signature, day, JACOB, 'א', null])
      const id = rows[0].result.entry.id
      expect(await errorOf(queryAs(db, stranger, `select * from public.remove_waitlist_entry($1)`, [id]))).toBe('forbidden')
      const removed = await queryAs(db, customer, `select status from public.remove_waitlist_entry($1)`, [id])
      expect(removed.rows[0].status).toBe('removed')
    })
  })
})
