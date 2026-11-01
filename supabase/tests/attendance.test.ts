import type pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { at, createOwner, createUser, errorOf, isolated, nextWorkingSunday, pool, queryAs, type Actor } from './harness'

afterAll(() => pool.end())

const book = `select * from public.book_appointment($1, $2::timestamptz, $3, $4, $5)`
const scheduler = (db: pg.PoolClient, now: string | Date) => db.query(`select app.run_scheduler($1::timestamptz) as r`, [now]).then((r) => r.rows[0].r)
const row = (db: pg.PoolClient, id: string) => db.query(`select * from public.appointments where id = $1`, [id]).then((r) => r.rows[0])
const inbox = (db: pg.PoolClient, profile: string, category: string) =>
  db.query(`select count(*)::int as n from public.inbox_messages where profile_id = $1 and category = $2`, [profile, category]).then((r) => r.rows[0].n)

/** A customer with an account books Jacob next working Sunday at `time`. */
async function booked(db: pg.PoolClient, time = '12:00', customer?: Actor) {
  const who = customer ?? (await createUser(db))
  const day = await nextWorkingSunday(db)
  const { rows } = await queryAs(db, who, book, [SERVICE.signature, await at(db, day, time), JACOB, 'לקוח', '0541234567'])
  return { customer: who, appointment: rows[0] as { id: string; starts_at: Date; confirmation_deadline: Date; confirmation_request_at: Date } }
}

describe('attendance confirmation rules', () => {
  // An appointment on Tuesday 10.11.2026 at 17:00 Israel time: request Monday 10:00, deadline Monday 20:00.
  const start = '2026-11-10T17:00:00+02:00'
  const plan = async (db: pg.PoolClient, now: string, hasAccount = true) =>
    (await db.query(`select (p).status, (p).request_at, (p).deadline from (select app.confirmation_plan($1::timestamptz, $2::timestamptz, $3, app.settings()) p) t`, [start, now, hasAccount])).rows[0]

  it('plans by when the appointment was booked', async () => {
    await isolated(async (db) => {
      const early = await plan(db, '2026-11-01T12:00:00+02:00')
      expect(early.status).toBe('pending')
      expect(early.request_at.toISOString()).toBe('2026-11-09T08:00:00.000Z')
      expect(early.deadline.toISOString()).toBe('2026-11-09T18:00:00.000Z')

      // After the request time, more than an hour before the deadline: ask right away.
      const afternoon = await plan(db, '2026-11-09T15:00:00+02:00')
      expect(afternoon.status).toBe('pending')
      expect(afternoon.request_at.toISOString()).toBe('2026-11-09T13:00:00.000Z')

      // Within the last hour before the deadline, or after it: never auto-cancelled; booking counts as confirmation.
      expect((await plan(db, '2026-11-09T19:30:00+02:00')).status).toBe('confirmed')
      expect((await plan(db, '2026-11-10T09:00:00+02:00')).status).toBe('confirmed')

      // A walk-in without an app account can't confirm, so confirmation isn't required.
      expect((await plan(db, '2026-11-01T12:00:00+02:00', false)).status).toBe('not_required')

      // The owner can exempt late bookings instead.
      await db.query(`update public.business_settings set late_booking_policy = 'exempt'`)
      const exempt = await plan(db, '2026-11-09T22:00:00+02:00')
      expect(exempt).toMatchObject({ status: 'not_required', deadline: null })
    })
  })

  it('applies the plan when a customer books, and staff walk-ins need no confirmation', async () => {
    await isolated(async (db) => {
      const { appointment } = await booked(db)
      expect(appointment).toMatchObject({ confirmation_status: 'pending', confirmed_at: null })
      expect(appointment.confirmation_deadline).not.toBeNull()

      const owner = await createOwner(db)
      const walkIn = (await queryAs(db, owner, `select (public.staff_upsert_customer('לקוח מזדמן', null)).id as id`)).rows[0].id
      const day = await nextWorkingSunday(db)
      const staffBooked = await queryAs(db, owner, `select * from public.staff_create_appointment($1, $2, $3, $4::timestamptz, '')`, [walkIn, JACOB, SERVICE.signature, await at(db, day, '15:00')])
      expect(staffBooked.rows[0].confirmation_status).toBe('not_required')
    })
  })
})

describe('confirming attendance', () => {
  it('locks the appointment against customer cancellation and moves; staff still can', async () => {
    await isolated(async (db) => {
      const { customer, appointment } = await booked(db)
      const confirmed = await queryAs(db, customer, `select * from public.confirm_attendance($1)`, [appointment.id])
      expect(confirmed.rows[0]).toMatchObject({ confirmation_status: 'confirmed', confirmed_by: 'customer' })
      expect(confirmed.rows[0].confirmed_at).not.toBeNull()
      // Confirming again is harmless.
      await queryAs(db, customer, `select public.confirm_attendance($1)`, [appointment.id])

      expect(await errorOf(queryAs(db, customer, `select public.cancel_appointment($1)`, [appointment.id]))).toBe('confirmed_locked')
      const day = await nextWorkingSunday(db)
      expect(await errorOf(queryAs(db, customer, `select public.reschedule_appointment($1, $2::timestamptz)`, [appointment.id, await at(db, day, '15:00')]))).toBe('confirmed_locked')

      const owner = await createOwner(db)
      const cancelled = await queryAs(db, owner, `select * from public.cancel_appointment($1, 'שיחת טלפון')`, [appointment.id])
      expect(cancelled.rows[0]).toMatchObject({ status: 'cancelled', cancellation_reason: 'staff' })
      expect(await inbox(db, customer.id!, 'appointment_cancelled')).toBe(1)
    })
  })

  it('refuses a customer confirmation after the deadline, whether or not the cancel job has run; staff may confirm', async () => {
    await isolated(async (db) => {
      const { customer, appointment } = await booked(db)
      await db.query(`update public.appointments set confirmation_deadline = now() - interval '1 minute' where id = $1`, [appointment.id])
      expect(await errorOf(queryAs(db, customer, `select public.confirm_attendance($1)`, [appointment.id]))).toBe('confirmation_closed')
      const owner = await createOwner(db)
      const byPhone = await queryAs(db, owner, `select * from public.confirm_attendance($1)`, [appointment.id])
      expect(byPhone.rows[0]).toMatchObject({ confirmation_status: 'confirmed', confirmed_by: 'staff' })
      // Staff confirming for the customer tells them, with a push.
      expect(await inbox(db, customer.id!, 'appointment_confirmed')).toBe(1)
    })
  })
})

describe('scheduler', () => {
  it('sends each confirmation request once, when it is due', async () => {
    await isolated(async (db) => {
      const { customer, appointment } = await booked(db)
      const before = new Date(appointment.confirmation_request_at.getTime() - 60_000)
      expect((await scheduler(db, before)).requested).toBe(0)
      expect((await scheduler(db, appointment.confirmation_request_at)).requested).toBe(1)
      expect((await scheduler(db, appointment.confirmation_request_at)).requested).toBe(0)
      expect(await inbox(db, customer.id!, 'confirmation_required')).toBe(1)
    })
  })

  it('auto-cancels only unconfirmed appointments past their deadline, once, and frees the time', async () => {
    await isolated(async (db) => {
      const unconfirmed = await booked(db, '12:00')
      const confirmed = await booked(db, '14:00')
      await queryAs(db, confirmed.customer, `select public.confirm_attendance($1)`, [confirmed.appointment.id])
      const afterDeadline = new Date(unconfirmed.appointment.confirmation_deadline.getTime() + 60_000)

      // Not yet: one minute before the deadline nothing happens.
      expect((await scheduler(db, new Date(unconfirmed.appointment.confirmation_deadline.getTime() - 60_000))).cancelled).toBe(0)

      expect((await scheduler(db, afterDeadline)).cancelled).toBe(1)
      expect(await row(db, unconfirmed.appointment.id)).toMatchObject({ status: 'cancelled', cancellation_reason: 'no_confirmation' })
      expect((await row(db, confirmed.appointment.id)).status).toBe('booked')
      expect(await inbox(db, unconfirmed.customer.id!, 'appointment_cancelled')).toBe(1)

      // Idempotent: running again changes nothing and notifies nobody twice.
      expect((await scheduler(db, afterDeadline)).cancelled).toBe(0)
      expect(await inbox(db, unconfirmed.customer.id!, 'appointment_cancelled')).toBe(1)

      // The freed time is bookable again.
      const day = await nextWorkingSunday(db)
      const other = await createUser(db)
      expect((await queryAs(db, other, book, [SERVICE.signature, await at(db, day, '12:00'), JACOB, 'אחר', null])).rows).toHaveLength(1)
    })
  })

  it('does not auto-cancel when the owner turned it off', async () => {
    await isolated(async (db) => {
      const { appointment } = await booked(db)
      await db.query(`update public.business_settings set auto_cancel_unconfirmed = false`)
      expect((await scheduler(db, new Date(appointment.confirmation_deadline.getTime() + 60_000))).cancelled).toBe(0)
      expect((await row(db, appointment.id)).status).toBe('booked')
    })
  })

  it('reminds confirmed appointments once, about two hours before, and never with stale timing', async () => {
    await isolated(async (db) => {
      const confirmed = await booked(db, '12:00')
      await queryAs(db, confirmed.customer, `select public.confirm_attendance($1)`, [confirmed.appointment.id])
      const pending = await booked(db, '14:00')
      const lateConfirm = await booked(db, '16:00')
      // Confirmed only an hour before: a "two hours before" reminder would be redundant.
      await db.query(`update public.appointments set confirmation_status = 'confirmed', confirmed_at = starts_at - interval '1 hour' where id = $1`, [lateConfirm.appointment.id])

      const twoHoursBefore = (a: { starts_at: Date }, minutes = 119) => new Date(a.starts_at.getTime() - minutes * 60_000)
      expect((await scheduler(db, twoHoursBefore(confirmed.appointment, 125))).reminded).toBe(0) // too early
      expect((await scheduler(db, twoHoursBefore(confirmed.appointment))).reminded).toBe(1)
      expect((await scheduler(db, twoHoursBefore(confirmed.appointment))).reminded).toBe(0) // never twice
      expect(await inbox(db, confirmed.customer.id!, 'appointment_reminder')).toBe(1)

      expect((await scheduler(db, twoHoursBefore(pending.appointment))).reminded).toBe(0) // not confirmed
      expect((await scheduler(db, twoHoursBefore(lateConfirm.appointment, 30))).reminded).toBe(0)

      // A reminder that would arrive within 15 minutes of the start is skipped as stale.
      const stale = await booked(db, '18:00')
      await queryAs(db, stale.customer, `select public.confirm_attendance($1)`, [stale.appointment.id])
      expect((await scheduler(db, twoHoursBefore(stale.appointment, 10))).reminded).toBe(0)
    })
  })
})

describe('confirmation versus the deadline, in two sessions at once', () => {
  // A real race needs two committed sessions, so this test commits its own rows and removes them afterwards.
  async function committedBooking(setup: pg.PoolClient, time: string) {
    const customer = await createUser(setup)
    const { rows: days } = await setup.query(`select to_char($1::date + 14, 'YYYY-MM-DD') as d`, [await nextWorkingSunday(setup)])
    await setup.query('begin')
    const { rows } = await queryAs(setup, customer, book, [SERVICE.signature, await at(setup, days[0].d, time), JACOB, 'לקוח', null])
    await setup.query('commit')
    // The deadline is a minute away: the customer may still confirm, and the job acts "two minutes from now".
    await setup.query(`update public.appointments set confirmation_deadline = now() + interval '1 minute' where id = $1`, [rows[0].id])
    return { customer, id: rows[0].id as string }
  }
  const runJob = (db: pg.PoolClient) => db.query(`select app.run_scheduler(now() + interval '2 minutes') as r`).then((r) => r.rows[0].r)
  /** Waits until session `pid` is blocked on a lock, so the overlap really happens. */
  async function waitUntilBlocked(observer: pg.PoolClient, pid: number) {
    for (let i = 0; i < 100; i++) {
      const { rows } = await observer.query(`select wait_event_type from pg_stat_activity where pid = $1`, [pid])
      if (rows[0]?.wait_event_type === 'Lock') return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('the confirmation never waited for the lock')
  }

  it('a confirmation in progress wins; a cancellation already in progress wins', async () => {
    const [setup, customerSession, job] = [await pool.connect(), await pool.connect(), await pool.connect()]
    const created: { customer: Actor; id: string }[] = []
    try {
      // 1. The customer's confirmation holds the row: the job skips it and, once it commits, leaves it alone.
      const first = await committedBooking(setup, '12:00')
      created.push(first)
      await customerSession.query('begin')
      await queryAs(customerSession, first.customer, `select public.confirm_attendance($1)`, [first.id])
      expect((await runJob(job)).cancelled).toBe(0)
      await customerSession.query('commit')
      expect((await runJob(job)).cancelled).toBe(0)
      expect(await row(setup, first.id)).toMatchObject({ status: 'booked', confirmation_status: 'confirmed' })

      // 2. The job cancels first: the customer's confirmation waits for it, then is refused — never "confirmed" on a cancelled time.
      const second = await committedBooking(setup, '14:00')
      created.push(second)
      await job.query('begin')
      expect((await runJob(job)).cancelled).toBe(1)
      await customerSession.query('begin')
      const pid = (await customerSession.query(`select pg_backend_pid() as pid`)).rows[0].pid as number
      const confirming = errorOf(queryAs(customerSession, second.customer, `select public.confirm_attendance($1)`, [second.id]))
      await waitUntilBlocked(setup, pid)
      await job.query('commit')
      expect(await confirming).toBe('invalid_status')
      await customerSession.query('rollback')
      expect(await row(setup, second.id)).toMatchObject({ status: 'cancelled', confirmation_status: 'pending', cancellation_reason: 'no_confirmation' })
    } finally {
      for (const db of [customerSession, job]) await db.query('rollback').catch(() => {})
      const ids = created.map((c) => c.id)
      const people = created.map((c) => c.customer.id)
      await setup.query(`delete from public.inbox_messages where profile_id = any($1)`, [people])
      for (const id of ids) await setup.query(`delete from public.notification_events where dedupe_key like $1`, [`slot-freed:${id}:%`])
      await setup.query(`delete from public.appointments where id = any($1)`, [ids])
      await setup.query(`delete from public.customers where profile_id = any($1)`, [people])
      await setup.query(`delete from auth.users where id = any($1)`, [people])
      for (const db of [setup, customerSession, job]) db.release()
    }
  })
})
