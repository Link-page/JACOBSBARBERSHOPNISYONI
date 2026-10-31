import { describe, expect, it } from 'vitest'

import { anonymous, at, createAccount, createOwner, expectAdminError, JACOB, SERVICE, signIn, stackAvailable, sunday } from './stack'

describe.skipIf(!stackAvailable)('access control (real Supabase Auth + RLS, through the admin adapter)', () => {
  it('anonymous visitors get the public catalogue and nothing else', async () => {
    const { api } = anonymous()
    expect(await api.auth.getState()).toEqual({ status: 'signed-out' })
    expect((await api.services.list()).length).toBeGreaterThanOrEqual(6)
    expect((await api.barbers.list()).map((b) => b.id)).toContain(JACOB)
    expect((await api.schedule.daySlots(SERVICE.signature, sunday(), JACOB)).length).toBeGreaterThan(0)
    await expectAdminError(api.appointments.list({ from: sunday(), to: sunday(1) }), 'forbidden')
    await expectAdminError(api.customers.search(''), 'forbidden')
    await expectAdminError(api.waitlist.list({ from: sunday(), to: sunday(1) }), 'forbidden')
    await expectAdminError(api.schedule.capacity(sunday()), 'forbidden')
    await expectAdminError(api.settings.save(await api.settings.get()), 'forbidden')
  })

  it('a customer account is not staff and cannot change business data', async () => {
    const customer = await createAccount('customer')
    const { api } = await signIn(customer)
    expect(await api.auth.getState()).toMatchObject({ status: 'not-staff', email: customer.email })
    expect(await api.appointments.list({ from: sunday(), to: sunday(1) })).toEqual([])
    expect(await api.customers.search('')).toEqual([])
    // RLS filters the update to zero rows; the adapter must report that, not "saved".
    await expectAdminError(api.settings.save(await api.settings.get()), 'forbidden')
    await expectAdminError(
      api.services.save({ name: 'ניסיון', description: '', durationMinutes: 30, price: 1, active: true }, []),
      'forbidden',
    )
    await expectAdminError(api.schedule.capacity(sunday()), 'forbidden')
    await expectAdminError(api.barbers.setAccountRole(customer.email, 'owner', null), 'forbidden')
  })

  it("a barber sees and manages only their own chair", async () => {
    const owner = await signIn(await createOwner())
    const noamAccount = await createAccount('customer')
    const noamChair = await owner.api.barbers.save({
      name: 'נועם',
      bio: '',
      photoUrl: null,
      whatsapp: '',
      active: true,
      sortOrder: 1,
      services: [{ serviceId: SERVICE.signature, durationMinutes: null }],
      hours: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: '09:00', end: '18:00' })),
      breaks: [],
    })
    await owner.api.barbers.setAccountRole(noamAccount.email, 'barber', noamChair.id)
    const noam = await signIn(noamAccount)
    expect(await noam.api.auth.getState()).toMatchObject({ status: 'staff', staff: { role: 'barber', barberId: noamChair.id } })

    const day = sunday(3)
    const customer = await owner.api.customers.upsert('לקוח של יעקב', '050-111-0001')
    const [slot] = await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)
    const jacobs = await owner.api.appointments.create({ customerId: customer.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: slot.startsAt, notes: '' })

    expect((await noam.api.appointments.list({ from: day, to: sunday(4) })).map((a) => a.id)).not.toContain(jacobs.id)
    expect(await noam.api.customers.search('לקוח של יעקב')).toEqual([])
    await expectAdminError(
      noam.api.appointments.create({ customerId: customer.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: at(day, '14:00'), notes: '' }),
      'forbidden',
    )
    await expectAdminError(noam.api.appointments.cancel(jacobs.id, ''), 'forbidden')
    await expectAdminError(noam.api.appointments.history(jacobs.id), 'forbidden')
    await expectAdminError(noam.api.settings.save(await noam.api.settings.get()), 'forbidden')
    await expectAdminError(noam.api.services.reorder([SERVICE.signature]), 'forbidden')
    expect((await noam.db.from('inbox_messages').select('id')).data).toEqual([]) // customers' notifications are private

    const [own] = await noam.api.schedule.daySlots(SERVICE.signature, day, noamChair.id)
    const mine = await noam.api.appointments.create({ customerId: customer.id, barberId: noamChair.id, serviceId: SERVICE.signature, startsAt: own.startsAt, notes: '' })
    expect((await noam.api.appointments.list({ from: day, to: sunday(4) })).map((a) => a.id)).toEqual([mine.id])
  })
})
