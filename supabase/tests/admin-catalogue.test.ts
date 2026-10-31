import { afterAll, describe, expect, it } from 'vitest'

import { JACOB, SERVICE } from './database'
import { createBarber, createOwner, errorOf, isolated, nextWorkingSunday, pool, queryAs, slotTimes } from './harness'

afterAll(() => pool.end())

const save = `select public.admin_save_barber_schedule($1, $2::jsonb, $3::jsonb, $4::jsonb)`

describe('owner catalogue operations', () => {
  it('replaces a schedule atomically and availability follows', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      await queryAs(db, owner, save, [
        JACOB,
        JSON.stringify([{ service_id: SERVICE.signature, duration_minutes: 60 }]),
        JSON.stringify([{ weekday: 0, start: '10:00', end: '14:00' }]),
        JSON.stringify([{ weekday: 0, start: '12:00', end: '12:30' }]),
      ])
      expect(await slotTimes(db, SERVICE.signature, day)).toEqual(['10:00', '10:30', '11:00', '12:30', '13:00'])
      expect(await slotTimes(db, SERVICE.fade, day)).toEqual([]) // no longer offered
    })
  })

  it('rolls back entirely on invalid input', async () => {
    await isolated(async (db) => {
      const day = await nextWorkingSunday(db)
      const owner = await createOwner(db)
      const before = await slotTimes(db, SERVICE.signature, day)
      const result = await errorOf(
        queryAs(db, owner, save, [JACOB, '[]', JSON.stringify([{ weekday: 0, start: '20:00', end: '09:00' }]), '[]']),
      )
      expect(result).toMatch(/check constraint/)
      expect(await slotTimes(db, SERVICE.signature, day)).toEqual(before)
    })
  })

  it('is owner-only', async () => {
    await isolated(async (db) => {
      const { user: noam, barberId } = await createBarber(db)
      expect(await errorOf(queryAs(db, noam, save, [barberId, '[]', '[]', '[]']))).toBe('forbidden')
      expect(await errorOf(queryAs(db, noam, `select public.admin_set_service_barbers($1, $2)`, [SERVICE.fade, [barberId]]))).toBe(
        'forbidden',
      )
    })
  })

  it('assigns a service to exactly the chosen barbers', async () => {
    await isolated(async (db) => {
      const owner = await createOwner(db)
      const { barberId } = await createBarber(db)
      await queryAs(db, owner, `select public.admin_set_service_barbers($1, $2)`, [SERVICE.fade, [barberId]])
      const { rows } = await db.query(`select barber_id from public.barber_services where service_id = $1`, [SERVICE.fade])
      expect(rows.map((r) => r.barber_id)).toEqual([barberId])
    })
  })
})
