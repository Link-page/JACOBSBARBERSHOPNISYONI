import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { anon, at, createBarber, createOwner, createUser, errorOf, isolated, nextWorkingSunday, pool, queryAs } from './harness'

afterAll(() => pool.end())

const book = `select * from public.book_appointment($1, $2::timestamptz, $3, $4, $5)`

describe('anonymous visitors', () => {
  it('see the public catalogue and availability, nothing private', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      expect((await queryAs(db, anon, `select name from public.services`)).rows.length).toBeGreaterThan(0)
      expect((await queryAs(db, anon, `select * from public.get_day_slots($1, $2::date)`, [SERVICE.signature, day])).rows.length).toBeGreaterThan(0)
      for (const table of [
        'customers', 'appointments', 'customer_notes', 'waitlist_entries', 'profiles', 'audit_log', 'notifications', 'time_blocks',
        'push_subscriptions', 'notification_preferences', 'notification_events', 'inbox_messages', 'push_deliveries', 'broadcasts',
      ]) {
        expect(await errorOf(queryAs(db, anon, `select * from public.${table}`)), table).toMatch(/permission denied/)
      }
      expect(await errorOf(queryAs(db, anon, `select * from public.staff_day_capacity(current_date)`))).toMatch(/permission denied/)
    })
  })
})

describe('customers', () => {
  it('see only their own appointments and customer record', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const [a, b] = [await createUser(db), await createUser(db)]
      await queryAs(db, a, book, [SERVICE.signature, await at(db, day, '10:00'), null, 'א', '050-1111111'])
      await queryAs(db, b, book, [SERVICE.signature, await at(db, day, '11:00'), null, 'ב', '050-2222222'])
      const own = await queryAs(db, a, `select c.full_name from public.appointments a join public.customers c on c.id = a.customer_id`)
      expect(own.rows.map((r) => r.full_name)).toEqual(['א'])
      expect((await queryAs(db, a, `select full_name from public.customers`)).rows.map((r) => r.full_name)).toEqual(['א'])
      expect((await queryAs(db, a, `select * from public.customer_notes`)).rows).toHaveLength(0)
    })
  })

  it('cannot promote themselves or edit the catalogue', async () => {
    await isolated(async (db) => {
      const customer = await createUser(db)
      expect(await errorOf(queryAs(db, customer, `update public.profiles set role = 'owner' where id = auth.uid()`))).toMatch(/permission denied/)
      const renamed = await queryAs(db, customer, `update public.profiles set full_name = 'שם חדש' where id = auth.uid() returning role`)
      expect(renamed.rows[0].role).toBe('customer')
      const priced = await queryAs(db, customer, `update public.services set price = 1 returning id`)
      expect(priced.rows).toHaveLength(0)
      expect(await errorOf(queryAs(db, customer, `select * from public.admin_set_user_role('x@y.z', 'owner')`))).toBe('forbidden')
    })
  })
})

describe('barbers', () => {
  it("cannot see another barber's appointments, customers or private records", async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const { user: noam } = await createBarber(db)
      const customer = await createUser(db)
      const { rows } = await queryAs(db, customer, book, [SERVICE.signature, await at(db, day, '10:00'), JACOB, 'לקוח של יעקב', null])
      await queryAs(db, owner, `insert into public.customer_notes (customer_id, body) values ($1, 'רגיש לחומרים')`, [rows[0].customer_id])

      expect((await queryAs(db, noam, `select * from public.appointments`)).rows).toHaveLength(0)
      expect((await queryAs(db, noam, `select * from public.customers`)).rows).toHaveLength(0)
      expect((await queryAs(db, noam, `select * from public.customer_notes`)).rows).toHaveLength(0)
      expect((await queryAs(db, noam, `select * from public.audit_log`)).rows).toHaveLength(0)
      expect(await errorOf(queryAs(db, noam, `select * from public.get_appointment_history($1)`, [rows[0].id]))).toBe('forbidden')

      expect((await queryAs(db, owner, `select * from public.appointments`)).rows).toHaveLength(1)
      expect((await queryAs(db, owner, `select * from public.customer_notes`)).rows).toHaveLength(1)
    })
  })

  it('block their own time but not another barber’s or the whole shop', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const { user: noam, barberId } = await createBarber(db)
      const insert = `insert into public.time_blocks (barber_id, starts_at, ends_at) values ($1, $2, $3) returning id`
      const range = [await at(db, day, '12:00'), await at(db, day, '13:00')]
      expect((await queryAs(db, noam, insert, [barberId, ...range])).rows).toHaveLength(1)
      expect(await errorOf(queryAs(db, noam, insert, [JACOB, ...range]))).toMatch(/row-level security/)
      expect(await errorOf(queryAs(db, noam, insert, [null, ...range]))).toMatch(/row-level security/)
    })
  })

  it('cannot change services, prices or roles', async () => {
    await isolated(async (db) => {
      const { user: noam } = await createBarber(db)
      expect((await queryAs(db, noam, `update public.services set price = 1 returning id`)).rows).toHaveLength(0)
      expect(await errorOf(queryAs(db, noam, `insert into public.services (name, duration_minutes, price) values ('x', 10, 1)`))).toMatch(
        /row-level security/,
      )
      expect(await errorOf(queryAs(db, noam, `select public.reorder_services(array[]::uuid[])`))).toBe('forbidden')
    })
  })
})

describe('owner', () => {
  it('assigns roles but cannot remove the last owner', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      const staff = await createUser(db)
      const { rows } = await db.query(`select email from auth.users where id = $1`, [staff.id])
      const { rows: ownerRow } = await db.query(`select email from auth.users where id = $1`, [owner.id])
      const promoted = await queryAs(db, owner, `select * from public.admin_set_user_role($1, 'barber')`, [rows[0].email])
      expect(promoted.rows[0].role).toBe('barber')
      expect(await errorOf(queryAs(db, owner, `select * from public.admin_set_user_role($1, 'customer')`, [ownerRow[0].email]))).toBe('last_owner')
    })
  })
})
