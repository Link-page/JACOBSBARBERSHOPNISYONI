import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { anon, at, createOwner, createUser, errorOf, isolated, nextWorkingSunday, pool, queryAs } from './harness'

afterAll(() => pool.end())

const register = `select public.register_customer($1, $2) as c`
const book = `select * from public.book_appointment($1, $2::timestamptz, $3, $4, $5)`

describe('customer accounts', () => {
  it('accepts Israeli mobile numbers in any common format and stores one canonical form', async () => {
    await isolated(async (db) => {
      const cases: [string, string | null][] = [
        ['054-123-4567', '0541234567'],
        ['+972 54 123 4567', '0541234567'],
        ['972541234567', '0541234567'],
        ['(050) 000 1111', '0500001111'],
        ['03-123-4567', null], // landline
        ['054-123', null],
        ['not a phone', null],
      ]
      for (const [input, expected] of cases) {
        const { rows } = await db.query(`select app.normalize_il_mobile($1) as v`, [input])
        expect(rows[0].v, input).toBe(expected)
      }
    })
  })

  it('ignores a role smuggled in through sign-up metadata', async () => {
    await isolated(async (db) => {
      const { rows } = await db.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
        [`meta-${Date.now()}@test.local`, { full_name: 'מנסה', role: 'owner' }],
      )
      const profile = await db.query(`select role, full_name from public.profiles where id = $1`, [rows[0].id])
      expect(profile.rows[0]).toEqual({ role: 'customer', full_name: 'מנסה' })
    })
  })

  it('creates the account’s own customer record once, and updates it on repeat', async () => {
    await isolated(async (db) => {
      const user = await createUser(db)
      const first = (await queryAs(db, user, register, ['  דניאל   כהן ', '054-123-4567'])).rows[0].c
      expect(first).toMatchObject({ full_name: 'דניאל כהן', phone: '0541234567' })
      const again = (await queryAs(db, user, register, ['דניאל כהן', '+972501112222'])).rows[0].c
      expect(again.id).toBe(first.id)
      const records = await db.query(`select count(*)::int as n from public.customers where profile_id = $1`, [user.id])
      expect(records.rows[0].n).toBe(1)
      const profile = await db.query(`select role, full_name, phone from public.profiles where id = $1`, [user.id])
      expect(profile.rows[0]).toEqual({ role: 'customer', full_name: 'דניאל כהן', phone: '0501112222' })
    })
  })

  it('rejects bad details and anonymous callers', async () => {
    await isolated(async (db) => {
      const user = await createUser(db)
      expect(await errorOf(queryAs(db, user, register, ['א', '0541234567']))).toBe('invalid_name')
      expect(await errorOf(queryAs(db, user, register, ['דניאל', '03-1234567']))).toBe('invalid_phone')
      expect(await errorOf(queryAs(db, anon, register, ['דניאל', '0541234567']))).toMatch(/permission denied/)
    })
  })

  it('never links an account to a record staff created for the same phone, and one number per account', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      const walkIn = (await queryAs(db, owner, `select (public.staff_upsert_customer('לקוח מזדמן', '054-999-0000')).id as id`)).rows[0].id
      const newcomer = await createUser(db)
      const mine = (await queryAs(db, newcomer, register, ['מישהו אחר', '0549990000'])).rows[0].c
      expect(mine.id).not.toBe(walkIn)
      const staffRecord = await db.query(`select profile_id from public.customers where id = $1`, [walkIn])
      expect(staffRecord.rows[0].profile_id).toBeNull()

      const second = await createUser(db)
      expect(await errorOf(queryAs(db, second, register, ['עוד אחד', '+972549990000']))).toBe('phone_in_use')
    })
  })

  it('cannot promote itself to staff', async () => {
    await isolated(async (db) => {
      const user = await createUser(db)
      await queryAs(db, user, register, ['דניאל', '0541234567'])
      await errorOf(queryAs(db, user, `update public.profiles set role = 'owner' where id = $1`, [user.id]))
      const { rows } = await db.query(`select role from public.profiles where id = $1`, [user.id])
      expect(rows[0].role).toBe('customer')
    })
  })

  it('limits how many upcoming appointments a customer can hold; staff are not limited', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const user = await createUser(db)
      await queryAs(db, user, register, ['דניאל', '0541234567'])
      for (const time of ['09:00', '10:00', '11:00']) {
        await queryAs(db, user, book, [SERVICE.signature, await at(db, day, time), JACOB, null, null])
      }
      const fourth = await at(db, day, '12:00')
      expect(await errorOf(queryAs(db, user, book, [SERVICE.signature, fourth, JACOB, null, null]))).toBe('booking_limit')

      const owner = await createOwner(db)
      const customerId = (await db.query(`select id from public.customers where profile_id = $1`, [user.id])).rows[0].id
      const staffBooked = await queryAs(db, owner, `select * from public.staff_create_appointment($1, $2, $3, $4::timestamptz, '')`, [customerId, JACOB, SERVICE.signature, fourth])
      expect(staffBooked.rows).toHaveLength(1)

      // Cancelling frees a place again.
      const first = (await db.query(`select id from public.appointments where customer_id = $1 order by starts_at limit 1`, [customerId])).rows[0].id
      await queryAs(db, user, `select public.cancel_appointment($1, '')`, [first])
      await queryAs(db, owner, `select public.cancel_appointment(id, '') from public.appointments where customer_id = $1 and starts_at = $2::timestamptz`, [customerId, fourth])
      const again = await queryAs(db, user, book, [SERVICE.signature, await at(db, day, '14:00'), JACOB, null, null])
      expect(again.rows).toHaveLength(1)
    })
  })

  it('limits active waiting-list requests per customer', async () => {
    await isolated(async (db) => {
      const user = await createUser(db)
      const customerId = (await queryAs(db, user, register, ['דניאל', '0541234567'])).rows[0].c.id
      // The guard runs as the signed-in customer; inserting directly isolates it from join_waitlist's own rules.
      const insertAsCustomer = async (offset: number) => {
        await db.query('savepoint w')
        await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user.id])
        try {
          await db.query(
            `insert into public.waitlist_entries (customer_id, service_id, wanted_date) values ($1, $2, current_date + $3::int)`,
            [customerId, SERVICE.signature, offset],
          )
          await db.query('release savepoint w')
        } catch (error) {
          await db.query('rollback to savepoint w')
          throw error
        } finally {
          await db.query(`select set_config('request.jwt.claim.sub', '', true)`)
        }
      }
      for (const offset of [7, 8, 9]) await insertAsCustomer(offset)
      expect(await errorOf(insertAsCustomer(10))).toBe('waitlist_limit')
    })
  })
})
