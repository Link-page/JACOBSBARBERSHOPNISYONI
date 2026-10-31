import { beforeAll, describe, expect, it } from 'vitest'

import { at, createOwner, expectAdminError, JACOB, SERVICE, signIn, stackAvailable, sunday, type Account, type Session } from './stack'

const time = (iso: string) => new Date(iso).getTime()

describe.skipIf(!stackAvailable)('appointments (real Supabase, through the admin adapter)', () => {
  let ownerAccount: Account
  let owner: Session

  beforeAll(async () => {
    ownerAccount = await createOwner()
    owner = await signIn(ownerAccount)
  })

  it('the owner session resolves to the owner role and Jacob’s chair', async () => {
    expect(await owner.api.auth.getState()).toMatchObject({ status: 'staff', staff: { role: 'owner', barberId: JACOB, name: 'יעקב' } })
  })

  it('creates, blocks double booking, reschedules, edits, keeps history and cancels', async () => {
    const day = sunday(0)
    const customer = await owner.api.customers.upsert('בדיקת אינטגרציה', '050-222-0001')
    const slots = await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)
    const first = slots[0]
    const later = slots.find((s) => time(s.startsAt) - time(first.startsAt) >= 3 * 3_600_000)!
    const input = { customerId: customer.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: first.startsAt, notes: 'בדיקה' }

    const created = await owner.api.appointments.create(input)
    expect(created).toMatchObject({ status: 'booked', customerName: 'בדיקת אינטגרציה', price: 90 })
    expect(time(created.endsAt) - time(created.startsAt)).toBe(45 * 60_000)

    await expectAdminError(owner.api.appointments.create(input), 'slot_unavailable')
    expect((await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).map((s) => time(s.startsAt))).not.toContain(time(first.startsAt))

    const moved = await owner.api.appointments.reschedule(created.id, later.startsAt)
    expect(time(moved.startsAt)).toBe(time(later.startsAt))
    expect((await owner.api.appointments.update(created.id, { notes: 'מעדיף מספריים' })).notes).toBe('מעדיף מספריים')
    expect((await owner.api.appointments.history(created.id)).map((h) => h.action)).toEqual(['insert', 'update', 'update'])

    expect((await owner.api.appointments.cancel(created.id, 'בדיקה')).status).toBe('cancelled')
    expect((await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).map((s) => time(s.startsAt))).toContain(time(later.startsAt))
    await expectAdminError(owner.api.appointments.cancel(created.id, ''), 'invalid_status')
  })

  it('records outcomes (completed / no-show, correctable)', async () => {
    const day = sunday(0)
    const customer = await owner.api.customers.upsert('לקוח תוצאה', '050-222-0002')
    const [slot] = await owner.api.schedule.daySlots(SERVICE.beard, day, JACOB)
    const a = await owner.api.appointments.create({ customerId: customer.id, barberId: JACOB, serviceId: SERVICE.beard, startsAt: slot.startsAt, notes: '' })
    expect((await owner.api.appointments.setStatus(a.id, 'completed')).status).toBe('completed')
    expect((await owner.api.appointments.setStatus(a.id, 'no_show')).status).toBe('no_show')
  })

  it('lets exactly one of two simultaneous bookings for the same slot succeed', async () => {
    const second = await signIn(ownerAccount)
    const day = sunday(1)
    const customer = await owner.api.customers.upsert('מקביליות', '050-222-0003')
    const [slot] = await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)
    const input = { customerId: customer.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: slot.startsAt, notes: '' }
    const results = await Promise.allSettled([owner.api.appointments.create(input), second.api.appointments.create(input)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toMatchObject({ code: 'slot_unavailable' })
  })

  it('blocks time, reports capacity, and unblocks', async () => {
    const day = sunday(1)
    const before = (await owner.api.schedule.capacity(day)).find((c) => c.barberId === JACOB)!
    const block = await owner.api.schedule.addBlock({ barberId: JACOB, startsAt: at(day, '15:00'), endsAt: at(day, '16:00'), reason: 'בדיקה' })
    expect((await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).map((s) => time(s.startsAt))).not.toContain(time(at(day, '15:00')))
    expect((await owner.api.schedule.blocks({ from: day, to: sunday(2) })).map((b) => b.id)).toContain(block.id)
    const blocked = (await owner.api.schedule.capacity(day)).find((c) => c.barberId === JACOB)!
    expect(blocked.freeSlots).toBe(before.freeSlots - 2)
    await owner.api.schedule.removeBlock(block.id)
    await expectAdminError(owner.api.schedule.removeBlock(block.id), 'forbidden') // nothing left to delete
  })
})
