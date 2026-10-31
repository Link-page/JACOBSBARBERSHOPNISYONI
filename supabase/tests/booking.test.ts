import pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE, testDatabaseUrl } from './database'
import { at, createBarber, createOwner, createUser, errorOf, isolated, nextWorkingSunday, pool, queryAs, slotTimes } from './harness'

afterAll(() => pool.end())

const book = `select * from public.book_appointment($1, $2::timestamptz, $3, $4, $5)`

describe('customer booking', () => {
  it('books a free slot with server-side duration and price', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const customer = await createUser(db)
      const start = await at(db, day, '10:00')
      const { rows } = await queryAs(db, customer, book, [SERVICE.cutBeard, start, null, 'דניאל', '054-000-0000'])
      expect(rows[0].barber_id).toBe(JACOB)
      expect(new Date(rows[0].ends_at).getTime() - new Date(rows[0].starts_at).getTime()).toBe(70 * 60_000)
      expect(Number(rows[0].price)).toBe(140)
      expect(await slotTimes(db, SERVICE.signature, day)).not.toContain('10:00')
    })
  })

  it('rejects a slot that is already taken', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const [a, b] = [await createUser(db), await createUser(db)]
      const start = await at(db, day, '11:00')
      await queryAs(db, a, book, [SERVICE.signature, start, JACOB, 'א', null])
      expect(await errorOf(queryAs(db, b, book, [SERVICE.signature, start, JACOB, 'ב', null]))).toBe('slot_unavailable')
    })
  })

  it('rejects off-grid times, closed days and times too soon', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const customer = await createUser(db)
      const offGrid = await at(db, day, '10:10')
      expect(await errorOf(queryAs(db, customer, book, [SERVICE.signature, offGrid, null, 'א', null]))).toBe('slot_unavailable')
      const soon = new Date(Date.now() + 5 * 60_000).toISOString()
      expect(await errorOf(queryAs(db, customer, book, [SERVICE.signature, soon, null, 'א', null]))).toBe('slot_unavailable')
    })
  })

  it('requires a signed-in customer with a name', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const start = await at(db, day, '12:00')
      expect(await errorOf(queryAs(db, { id: null }, book, [SERVICE.signature, start, null, 'א', null]))).toMatch(/permission denied/)
      const customer = await createUser(db)
      expect(await errorOf(queryAs(db, customer, book, [SERVICE.signature, start, null, '', null]))).toBe('customer_details_required')
    })
  })

  it('cannot write appointments directly, and the database rejects overlaps from any path', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const customer = await createUser(db)
      const start = await at(db, day, '16:00')
      expect(
        await errorOf(
          queryAs(db, customer, `insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price)
                                 values (gen_random_uuid(), $1, $2, $3, $3::timestamptz + interval '45 minutes', 0)`, [JACOB, SERVICE.signature, start]),
        ),
      ).toMatch(/permission denied/)
      const { rows } = await db.query(`insert into public.customers (full_name) values ('ישיר') returning id`)
      const insert = `insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price)
                      values ($1, $2, $3, $4::timestamptz, $4::timestamptz + interval '45 minutes', 90)`
      await db.query(insert, [rows[0].id, JACOB, SERVICE.signature, start])
      await db.query('savepoint overlap')
      expect(await errorOf(db.query(insert, [rows[0].id, JACOB, SERVICE.signature, await at(db, day, '16:30')]))).toMatch(
        /appointments_no_overlap/,
      )
      await db.query('rollback to savepoint overlap')
    })
  })
})

describe('simultaneous bookings', () => {
  it('lets exactly one of two concurrent requests for the same slot succeed', async () => {
    const setup = await pool.connect()
    const day = await nextWorkingSunday(setup)
    // A different week from the other tests, because these rows are committed.
    const later = new Date(`${day}T12:00:00Z`)
    later.setUTCDate(later.getUTCDate() + 7)
    const date = later.toISOString().slice(0, 10)
    const start = await at(setup, date, '17:00')
    const users = [await createUser(setup), await createUser(setup)]
    setup.release()

    const attempt = async (userId: string, name: string) => {
      const client = new pg.Client({ connectionString: testDatabaseUrl() })
      await client.connect()
      try {
        await client.query('begin')
        await client.query('set local role authenticated')
        await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId])
        await client.query(book, [SERVICE.signature, start, JACOB, name, null])
        await client.query('select pg_sleep(0.3)') // hold the lock while the other request arrives
        await client.query('commit')
        return 'booked'
      } catch (error) {
        await client.query('rollback')
        return (error as Error).message
      } finally {
        await client.end()
      }
    }

    try {
      const results = await Promise.all([attempt(users[0].id!, 'ראשון'), attempt(users[1].id!, 'שני')])
      expect(results.sort()).toEqual(['booked', 'slot_unavailable'])
      const { rows } = await pool.query(`select count(*)::int as n from public.appointments where starts_at = $1 and status = 'booked'`, [start])
      expect(rows[0].n).toBe(1)
    } finally {
      await pool.query(`delete from public.appointments where starts_at = $1`, [start])
    }
  })
})

describe('changing appointments', () => {
  it('customers cancel and reschedule only outside the notice period', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const customer = await createUser(db)
      const { rows } = await queryAs(db, customer, book, [SERVICE.signature, await at(db, day, '09:00'), null, 'א', null])
      const id = rows[0].id
      const moved = await queryAs(db, customer, `select * from public.reschedule_appointment($1, $2)`, [id, await at(db, day, '14:00')])
      expect(moved.rows[0].starts_at.toISOString()).toBe(await at(db, day, '14:00').then((t) => new Date(t).toISOString()))
      expect(
        await errorOf(queryAs(db, customer, `select * from public.reschedule_appointment($1, $2)`, [id, await at(db, day, '13:00')])),
      ).toBe('slot_unavailable') // lunch break

      // Inside the notice period (default 3 hours) the customer can no longer change it.
      const { rows: original } = await db.query(`select starts_at, ends_at from public.appointments where id = $1`, [id])
      await db.query(`update public.appointments set starts_at = now() + interval '1 hour', ends_at = now() + interval '105 minutes' where id = $1`, [id])
      expect(await errorOf(queryAs(db, customer, `select * from public.cancel_appointment($1)`, [id]))).toBe('too_late_to_change')
      await db.query(`update public.appointments set starts_at = $2, ends_at = $3 where id = $1`, [id, original[0].starts_at, original[0].ends_at])
      const cancelled = await queryAs(db, customer, `select * from public.cancel_appointment($1, 'שינוי תוכניות')`, [id])
      expect(cancelled.rows[0].status).toBe('cancelled')
      expect(await slotTimes(db, SERVICE.signature, day)).toContain('14:00')
    })
  })

  it("barbers manage only their own chair; the owner manages everyone's", async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const { user: noam, barberId: noamChair } = await createBarber(db)
      const { rows: c } = await queryAs(db, owner, `select * from public.staff_upsert_customer('לקוח טלפוני', '050-1234567')`)
      const create = `select * from public.staff_create_appointment($1, $2, $3, $4)`
      expect(await errorOf(queryAs(db, noam, create, [c[0].id, JACOB, SERVICE.signature, await at(db, day, '10:00')]))).toBe('forbidden')
      const mine = await queryAs(db, noam, create, [c[0].id, noamChair, SERVICE.signature, await at(db, day, '10:00')])
      const jacobs = await queryAs(db, owner, create, [c[0].id, JACOB, SERVICE.signature, await at(db, day, '10:00')])
      expect(await errorOf(queryAs(db, noam, `select * from public.set_appointment_status($1, 'completed')`, [jacobs.rows[0].id]))).toBe(
        'forbidden',
      )
      const done = await queryAs(db, noam, `select * from public.set_appointment_status($1, 'no_show')`, [mine.rows[0].id])
      expect(done.rows[0].status).toBe('no_show')
      expect(await errorOf(queryAs(db, owner, create, [c[0].id, JACOB, SERVICE.signature, await at(db, day, '10:30')]))).toBe(
        'slot_unavailable',
      )
    })
  })

  it('a barber account not yet linked to a chair can manage nothing', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const unlinked = await createUser(db, 'barber')
      const { rows: c } = await db.query(`insert into public.customers (full_name) values ('לקוח') returning id`)
      const create = `select * from public.staff_create_appointment($1, $2, $3, $4)`
      expect(await errorOf(queryAs(db, unlinked, create, [c[0].id, JACOB, SERVICE.signature, await at(db, day, '10:00')]))).toBe('forbidden')
      expect((await queryAs(db, unlinked, `select * from public.appointments`)).rows).toHaveLength(0)
    })
  })

  it('a customer cannot set an outcome or touch someone else’s booking', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const [a, b] = [await createUser(db), await createUser(db)]
      const { rows } = await queryAs(db, a, book, [SERVICE.signature, await at(db, day, '15:00'), null, 'א', null])
      expect(await errorOf(queryAs(db, a, `select * from public.set_appointment_status($1, 'completed')`, [rows[0].id]))).toBe('forbidden')
      expect(await errorOf(queryAs(db, b, `select * from public.cancel_appointment($1)`, [rows[0].id]))).toBe('forbidden')
    })
  })

  it('records an audit trail for every change', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const customer = await createUser(db)
      const { rows } = await queryAs(db, customer, book, [SERVICE.signature, await at(db, day, '11:00'), null, 'א', null])
      await queryAs(db, owner, `select * from public.update_appointment($1, null, 'מעדיף מספריים')`, [rows[0].id])
      const history = await queryAs(db, owner, `select action, actor_id from public.get_appointment_history($1)`, [rows[0].id])
      expect(history.rows.map((r) => r.action)).toEqual(['insert', 'update'])
      expect(history.rows[1].actor_id).toBe(owner.id)
    })
  })
})
