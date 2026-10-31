import pg from 'pg'

import { testDatabaseUrl } from './database'

export const pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 6 })

export type Actor = { id: string | null }
export const anon: Actor = { id: null }

/** Runs `fn` in a transaction that is always rolled back, so tests don't affect each other. */
export async function isolated<T>(fn: (db: pg.PoolClient) => Promise<T>) {
  const db = await pool.connect()
  try {
    await db.query('begin')
    return await fn(db)
  } finally {
    await db.query('rollback')
    db.release()
  }
}

/** Switches the transaction to an API caller, as Supabase does for each request. */
export async function actAs(db: pg.PoolClient, actor: Actor) {
  await db.query(`set local role ${actor.id ? 'authenticated' : 'anon'}`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [actor.id ?? ''])
}

/** Back to the superuser (test setup, inspection). */
export async function actAsSystem(db: pg.PoolClient) {
  await db.query('reset role')
  await db.query(`select set_config('request.jwt.claim.sub', '', true)`)
}

/** Runs one query as `actor`, then returns to the superuser. */
export async function queryAs<T extends pg.QueryResultRow = pg.QueryResultRow>(
  db: pg.PoolClient,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
) {
  await db.query('savepoint as_actor')
  await actAs(db, actor)
  try {
    const result = await db.query<T>(sql, params)
    await db.query('release savepoint as_actor')
    return result
  } catch (error) {
    await db.query('rollback to savepoint as_actor')
    throw error
  } finally {
    await actAsSystem(db)
  }
}

let counter = 0
/** Signs up a user (the profile trigger runs) and sets their role. */
export async function createUser(db: pg.PoolClient, role: 'owner' | 'barber' | 'customer' = 'customer'): Promise<Actor> {
  counter += 1
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (email) values ($1) returning id`,
    [`${role}-${counter}-${Date.now()}@test.local`],
  )
  await db.query(`update public.profiles set role = $2 where id = $1`, [rows[0].id, role])
  return { id: rows[0].id }
}

/** A second barber linked to a new staff account. */
export async function createBarber(db: pg.PoolClient, name = 'נועם') {
  const user = await createUser(db, 'barber')
  const { rows } = await db.query<{ id: string }>(
    `insert into public.barbers (name, user_id, sort_order) values ($1, $2, 1) returning id`,
    [name, user.id],
  )
  const barberId = rows[0].id
  await db.query(`insert into public.barber_services (barber_id, service_id) select $1, id from public.services`, [barberId])
  await db.query(
    `insert into public.working_hours (barber_id, weekday, start_time, end_time)
     select $1, d, '09:00', '20:00' from generate_series(0, 4) d`,
    [barberId],
  )
  return { user, barberId }
}

/** Links Jacob's barber row to an owner account. */
export async function createOwner(db: pg.PoolClient) {
  const owner = await createUser(db, 'owner')
  await db.query(`update public.barbers set user_id = $1 where id = '11111111-1111-4111-8111-111111111111'`, [owner.id])
  return owner
}

/** A working Sunday 7–13 days ahead (YYYY-MM-DD), well inside the booking window. */
export async function nextWorkingSunday(db: pg.PoolClient): Promise<string> {
  const { rows } = await db.query<{ d: string }>(
    `select to_char(d + ((7 - extract(dow from d)::int) % 7) + 7, 'YYYY-MM-DD') as d
     from (select (now() at time zone 'Asia/Jerusalem')::date as d) t`,
  )
  return rows[0].d
}

/** An instant for a local wall-clock time in the shop's time zone, as ISO text. */
export async function at(db: pg.PoolClient, date: string, time: string): Promise<string> {
  const { rows } = await db.query<{ t: string }>(
    `select to_char((($1::date + $2::time) at time zone 'Asia/Jerusalem') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as t`,
    [date, time],
  )
  return rows[0].t
}

export async function slotTimes(db: pg.PoolClient, service: string, date: string, barber: string | null = null) {
  const { rows } = await db.query<{ t: string }>(
    `select to_char(starts_at at time zone 'Asia/Jerusalem', 'HH24:MI') as t
     from public.get_day_slots($1, $2::date, $3) order by starts_at`,
    [service, date, barber],
  )
  return rows.map((r) => r.t)
}

/** The Postgres error message for a rejected promise. */
export async function errorOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return (error as Error).message
  }
  return 'no error'
}
