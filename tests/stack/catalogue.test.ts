import { beforeAll, describe, expect, it } from 'vitest'

import { anonymous, createAccount, createOwner, expectAdminError, JACOB, signIn, stackAvailable, type Session } from './stack'

describe.skipIf(!stackAvailable)('owner catalogue, settings and media (real Supabase)', () => {
  let owner: Session
  beforeAll(async () => {
    owner = await signIn(await createOwner())
  })

  it('saves settings to the shared table and restores them', async () => {
    const original = await owner.api.settings.get()
    await owner.api.settings.save({ ...original, bookingPolicy: 'מדיניות בדיקה' })
    expect((await anonymous().api.settings.get()).bookingPolicy).toBe('מדיניות בדיקה')
    await owner.api.settings.save(original)
    expect((await owner.api.settings.get()).bookingPolicy).toBe(original.bookingPolicy)
  })

  it('creates, assigns and orders services; hidden services stay private', async () => {
    const created = await owner.api.services.save({ name: 'שירות בדיקה', description: '', durationMinutes: 20, price: 50, active: false }, [JACOB])
    const list = await owner.api.services.list()
    expect(list.find((s) => s.id === created.id)).toMatchObject({ active: false, price: 50, durationMinutes: 20 })
    const jacob = (await owner.api.barbers.list()).find((b) => b.id === JACOB)!
    expect(jacob.services.map((s) => s.serviceId)).toContain(created.id)
    await owner.api.services.reorder([created.id, ...list.filter((s) => s.id !== created.id).map((s) => s.id)])
    expect((await owner.api.services.list())[0].id).toBe(created.id)
    expect((await anonymous().api.services.list()).map((s) => s.id)).not.toContain(created.id)
  })

  it("round-trips Jacob's schedule atomically", async () => {
    const byDay = (a: { weekday: number }, b: { weekday: number }) => a.weekday - b.weekday
    const jacob = (await owner.api.barbers.list()).find((b) => b.id === JACOB)!
    const saved = await owner.api.barbers.save(jacob)
    expect([...saved.hours].sort(byDay)).toEqual([...jacob.hours].sort(byDay))
    expect([...saved.breaks].sort(byDay)).toEqual([...jacob.breaks].sort(byDay))
    expect(saved.services.map((s) => s.serviceId).sort()).toEqual(jacob.services.map((s) => s.serviceId).sort())
  })

  it('lets only the owner upload media', async () => {
    const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'logo.png', { type: 'image/png' })
    const url = await owner.api.settings.uploadImage(png, 'logo')
    expect(url).toContain('/storage/v1/object/public/media/logo/')
    const barber = await signIn(await createAccount('barber'))
    await expectAdminError(barber.api.settings.uploadImage(png, 'gallery'), 'forbidden')
  })
})
