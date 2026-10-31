import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { signedInCustomer } from './customer-app'
import { JACOB, SERVICE, anonymous, at, createAccount, createOwner, expectAdminError, signIn, stackAvailable, sunday } from './stack'

const day = sunday(5)
const query = { serviceId: SERVICE.signature, barberId: JACOB, duration: 45 }
const unique = () => randomUUID().slice(0, 8)

/** A customer of the real customer-app modules with an appointment on `day` at the n-th free slot. */
async function customerWithAppointment(phone: string, slot: number) {
  const app = await signedInCustomer(phone)
  const slots = await app.booking.getDaySlots(day, query)
  const appointment = await app.booking.createAppointment({ serviceId: SERVICE.signature, barberId: JACOB, start: at(day, slots[slot].time) })
  return { app, appointment }
}

describe.skipIf(!stackAvailable)('attendance confirmation (real Supabase, through the app modules)', () => {
  it('a confirmed appointment can be cancelled only by staff, and the customer is told', async () => {
    const { app, appointment } = await customerWithAppointment('0549000101', 0)
    // Booked weeks ahead: confirmation will be requested the day before.
    expect(appointment).toMatchObject({ confirmationStatus: 'pending', confirmedAt: null })
    expect(appointment.confirmationDeadline).not.toBeNull()

    const confirmed = await app.booking.confirmAttendance(appointment.id)
    expect(confirmed.confirmationStatus).toBe('confirmed')
    expect(confirmed.confirmedAt).not.toBeNull()
    expect((await app.booking.confirmAttendance(appointment.id)).confirmedAt).toBe(confirmed.confirmedAt) // repeating is harmless

    await expect(app.booking.cancelAppointment(appointment.id)).rejects.toMatchObject({ code: 'confirmed_locked' })
    const later = (await app.booking.getDaySlots(day, query)).at(-1)!.time
    await expect(app.booking.rescheduleAppointment(confirmed, { barberId: JACOB, start: at(day, later) })).rejects.toMatchObject({ code: 'confirmed_locked' })
    expect((await app.booking.listAppointments())[0].status).toBe('booked')

    const owner = await signIn(await createOwner())
    const cancelled = await owner.api.appointments.cancel(appointment.id, 'הלקוח התקשר')
    expect(cancelled.status).toBe('cancelled')
    const [message] = await app.notifications.listInbox()
    expect(message).toMatchObject({ category: 'appointment_cancelled', readAt: null, url: `?go=appointment&id=${appointment.id}` })
    await app.notifications.markRead()
    expect((await app.notifications.listInbox()).every((m) => m.readAt !== null)).toBe(true)
  })

  it('staff confirm for a customer after a phone call, and the customer sees it', async () => {
    const { app, appointment } = await customerWithAppointment('0549000102', 2)
    const owner = await signIn(await createOwner())
    const confirmed = await owner.api.appointments.confirm(appointment.id)
    expect(confirmed).toMatchObject({ confirmationStatus: 'confirmed', confirmedBy: 'staff' })
    expect((await app.notifications.listInbox()).map((m) => m.category)).toEqual(['appointment_confirmed'])
    expect((await app.booking.listAppointments())[0].confirmationStatus).toBe('confirmed')
  })
})

describe.skipIf(!stackAvailable)('devices and preferences (real Supabase)', () => {
  it('keeps each account’s devices and preferences private to that account', async () => {
    const [dana, eli] = [await signedInCustomer('0549000103'), await signedInCustomer('0549000104')]
    const endpoint = `https://push.test/${unique()}`
    await dana.notifications.savePushSubscription({ endpoint, keys: { p256dh: 'k'.repeat(87), auth: 'a'.repeat(22) } })
    expect((await dana.db.from('push_subscriptions').select('endpoint')).data).toEqual([{ endpoint }])
    expect((await eli.db.from('push_subscriptions').select('endpoint')).data).toEqual([])
    // Preferences are private too.
    expect((await eli.db.from('notification_preferences').select('*')).data).toEqual([])

    expect(await dana.notifications.getPreferences()).toEqual({ reminders: true, shopMessages: false })
    await dana.notifications.setPreferences({ reminders: false, shopMessages: true })
    expect(await dana.notifications.getPreferences()).toEqual({ reminders: false, shopMessages: true })

    await dana.notifications.removePushSubscription(endpoint)
    expect((await dana.db.from('push_subscriptions').select('endpoint')).data).toEqual([])
    // The dispatcher's functions are closed to customers.
    expect((await dana.db.rpc('push_claim', { p_limit: 10 })).error).not.toBeNull()
  })
})

describe.skipIf(!stackAvailable)('messages from the shop (real Supabase, through the admin adapter)', () => {
  it('the owner reaches opted-in customers once per send and sees counts only', async () => {
    const optedIn = await signedInCustomer('0549000105')
    await optedIn.notifications.setPreferences({ reminders: true, shopMessages: true })
    const notOptedIn = await signedInCustomer('0549000106')

    const owner = await signIn(await createOwner())
    const input = { title: `סגור מחר ${unique()}`, body: 'המספרה סגורה מחר בגלל החג.', audience: 'opted_in' as const, link: null, idempotencyKey: randomUUID() }
    const sent = await owner.api.notifications.send(input)
    expect(sent).toMatchObject({ duplicate: false })
    expect(sent.recipients).toBeGreaterThanOrEqual(1)
    expect(await owner.api.notifications.send(input)).toMatchObject({ id: sent.id, duplicate: true }) // a double submit sends nothing more

    expect((await optedIn.notifications.listInbox()).filter((m) => m.title === input.title)).toHaveLength(1)
    expect(await notOptedIn.notifications.listInbox()).toEqual([])

    const [latest] = await owner.api.notifications.history()
    expect(latest).toMatchObject({ id: sent.id, title: input.title, recipients: sent.recipients })
    expect(Object.keys(latest)).not.toContain('recipientIds')

    await expectAdminError(owner.api.notifications.send({ ...input, idempotencyKey: randomUUID(), title: 'מיד שוב' }), 'broadcast_too_soon')
  })

  it('refuses customers, signed-out callers, and barbers until the owner authorises them', async () => {
    const message = () => ({ title: `איחור ${unique()}`, body: 'מאחר ברבע שעה.', audience: 'upcoming' as const, link: null, idempotencyKey: randomUUID() })
    const customer = await signIn(await createAccount('customer'))
    await expectAdminError(customer.api.notifications.send(message()), 'forbidden')
    await expectAdminError(anonymous().api.notifications.send(message()), 'forbidden')

    const barberAccount = await createAccount('barber')
    const barber = await signIn(barberAccount)
    await expectAdminError(barber.api.notifications.send(message()), 'forbidden')
    await expectAdminError(barber.api.barbers.setBroadcastPermission(barberAccount.id, true), 'forbidden')

    const owner = await signIn(await createOwner())
    await owner.api.barbers.setBroadcastPermission(barberAccount.id, true)
    const state = await (await signIn(barberAccount)).api.auth.getState()
    expect(state).toMatchObject({ status: 'staff', staff: { canBroadcast: true } })
    // Authorised, but with no chair of their own: their "upcoming customers" audience is empty.
    expect(await barber.api.notifications.send(message())).toMatchObject({ recipients: 0, duplicate: false })
    expect(await barber.api.notifications.history()).toHaveLength(1) // only their own sends
  })
})
