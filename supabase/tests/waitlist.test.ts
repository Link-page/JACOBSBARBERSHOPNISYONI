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

  it('offers a freed slot to the longest-waiting customer and holds it for them', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const { first, appointmentId } = await fillDay(db, day)
      const [early, late, outsider] = [await createUser(db), await createUser(db), await createUser(db)]
      const e1 = await queryAs(db, early, join, [SERVICE.signature, day, null, 'ראשון בתור', null])
      await db.query(`update public.waitlist_entries set created_at = now() - interval '1 hour' where id = $1`, [e1.rows[0].result.entry.id])
      await queryAs(db, late, join, [SERVICE.signature, day, null, 'שני בתור', null])

      await queryAs(db, first, `select * from public.cancel_appointment($1)`, [appointmentId])

      const entries = await queryAs(db, owner, `select customer_id, status, offered_starts_at from public.waitlist_entries order by created_at`)
      expect(entries.rows.map((r) => r.status)).toEqual(['offered', 'waiting'])
      const pending = await queryAs(db, owner, `select status, message from public.notifications`)
      expect(pending.rows).toHaveLength(1)
      expect(pending.rows[0].status).toBe('pending') // nothing is sent without a provider

      // The held slot is hidden from everyone else.
      expect(await slotTimes(db, SERVICE.signature, day)).not.toContain('10:00')
      expect(await errorOf(queryAs(db, outsider, book, [SERVICE.signature, await at(db, day, '10:00'), null, 'זר', null]))).toBe(
        'slot_unavailable',
      )

      const claimed = await queryAs(db, early, `select * from public.claim_waitlist_offer($1)`, [e1.rows[0].result.entry.id])
      expect(claimed.rows[0].status).toBe('booked')
      expect(await errorOf(queryAs(db, early, `select * from public.claim_waitlist_offer($1)`, [e1.rows[0].result.entry.id]))).toBe(
        'offer_expired',
      )
    })
  })

  it('passes an expired offer to the next customer', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const { first, appointmentId } = await fillDay(db, day)
      const [a, b] = [await createUser(db), await createUser(db)]
      const ea = await queryAs(db, a, join, [SERVICE.signature, day, null, 'א', null])
      await db.query(`update public.waitlist_entries set created_at = now() - interval '1 hour' where id = $1`, [ea.rows[0].result.entry.id])
      const eb = await queryAs(db, b, join, [SERVICE.signature, day, null, 'ב', null])
      await queryAs(db, first, `select * from public.cancel_appointment($1)`, [appointmentId])

      await db.query(`update public.waitlist_entries set offer_expires_at = now() - interval '1 minute' where id = $1`, [ea.rows[0].result.entry.id])
      const expired = await queryAs(db, owner, `select public.run_waitlist_maintenance() as n`)
      expect(expired.rows[0].n).toBe(1)
      const statuses = await queryAs(db, owner, `select id, status from public.waitlist_entries`)
      const byId = new Map(statuses.rows.map((r) => [r.id, r.status]))
      expect(byId.get(ea.rows[0].result.entry.id)).toBe('expired')
      expect(byId.get(eb.rows[0].result.entry.id)).toBe('offered')
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
