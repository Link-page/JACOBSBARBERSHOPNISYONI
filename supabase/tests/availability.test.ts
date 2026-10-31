import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { at, isolated, nextWorkingSunday, pool, slotTimes } from './harness'

afterAll(() => pool.end())

describe('availability', () => {
  it('offers grid slots inside working hours and skips the lunch break', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const slots = await slotTimes(db, SERVICE.signature, day)
      expect(slots[0]).toBe('09:00')
      expect(slots).toContain('12:00') // 12:00–12:45 ends before the 13:00 break
      expect(slots).not.toContain('12:30') // would run into the break
      expect(slots).not.toContain('13:00')
      expect(slots).toContain('13:30')
      expect(slots.at(-1)).toBe('19:00') // 45 minutes must end by 20:00
    })
  })

  it('removes times taken by an appointment, accounting for service length', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const { rows } = await db.query(`insert into public.customers (full_name) values ('בדיקה') returning id`)
      await db.query(
        `insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price)
         values ($1, $2, $3, $4, $4::timestamptz + interval '45 minutes', 90)`,
        [rows[0].id, JACOB, SERVICE.signature, await at(db, day, '10:00')],
      )
      const slots = await slotTimes(db, SERVICE.signature, day)
      expect(slots).not.toContain('09:30') // 09:30–10:15 overlaps
      expect(slots).not.toContain('10:00')
      expect(slots).not.toContain('10:30')
      expect(slots).toContain('11:00')
      // A 25-minute beard trim fits 09:30–09:55 before the appointment.
      expect(await slotTimes(db, SERVICE.beard, day)).toContain('09:30')
    })
  })

  it('respects blocked time and a barber-specific duration', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      await db.query(`insert into public.time_blocks (barber_id, starts_at, ends_at, reason) values ($1, $2, $3, 'בדיקה')`, [
        JACOB,
        await at(db, day, '15:00'),
        await at(db, day, '16:00'),
      ])
      const slots = await slotTimes(db, SERVICE.signature, day)
      expect(slots).not.toContain('14:30')
      expect(slots).not.toContain('15:30')
      expect(slots).toContain('16:00')

      await db.query(`update public.barber_services set duration_minutes = 90 where barber_id = $1 and service_id = $2`, [
        JACOB,
        SERVICE.signature,
      ])
      expect(await slotTimes(db, SERVICE.signature, day)).not.toContain('12:00') // 12:00–13:30 hits the break
    })
  })

  it('classifies days for the month view', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      await db.query(
        `insert into public.time_blocks (barber_id, starts_at, ends_at, reason)
         values (null, $1, $2, 'חג')`,
        [await at(db, day, '00:00'), await at(db, day, '24:00')],
      )
      const { rows } = await db.query<{ day: string; status: string }>(
        `select to_char(day, 'YYYY-MM-DD') as day, status from public.get_month_availability($1, $2::date)`,
        [SERVICE.signature, day],
      )
      const status = new Map(rows.map((r) => [r.day, r.status]))
      expect(status.get(day)).toBe('closed')
      const saturday = rows.find((r) => new Date(`${r.day}T12:00:00Z`).getUTCDay() === 6 && r.day > day)
      if (saturday) expect(saturday.status).toBe('closed')
      expect(rows.some((r) => r.status === 'available')).toBe(true)
    })
  })

  it('reports nothing for days outside the booking window', async () => {
    await isolated(async (db) => {
      const { rows } = await db.query(`select * from public.get_day_slots($1, (current_date + 400), null)`, [SERVICE.signature])
      expect(rows).toHaveLength(0)
    })
  })
})
