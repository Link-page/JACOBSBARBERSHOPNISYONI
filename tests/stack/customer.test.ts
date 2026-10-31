import { describe, expect, it } from 'vitest'

import { createSupabaseAccount } from '@/account/supabase-account'
import { createSupabaseBookingApi } from '@/api/supabase/supabase-booking-api'
import { createSupabaseCatalogue } from '@/catalogue/supabase-catalogue'

import { JACOB, SERVICE, at, browserClient, createAccount, mailpitUrl, serviceClient, stackAvailable, sunday, type Account } from './stack'

/** The customer app as it runs in a browser: one client shared by its three modules. */
function customerApp() {
  const db = browserClient()
  return {
    db,
    account: createSupabaseAccount(db, 'http://127.0.0.1:3000/'),
    booking: createSupabaseBookingApi(db),
    catalogue: createSupabaseCatalogue(db),
  }
}

/** A confirmed account signed in to the customer app with a complete profile. */
async function signedInCustomer(phone: string, existing?: Account) {
  const account = existing ?? (await createAccount('customer'))
  const app = customerApp()
  await app.account.signIn(account.email, account.password)
  await app.account.completeProfile({ fullName: `לקוח ${phone.slice(-4)}`, phone })
  return app
}

/** Waits for the confirmation email in Mailpit and returns the link in it. */
async function confirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    const { messages } = (await search.json()) as { messages?: { ID: string }[] }
    if (messages?.length) {
      const message = (await (await fetch(`${mailpitUrl}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string; Text: string }
      const link = `${message.HTML} ${message.Text}`.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)?.[0]
      if (link) return link.replace(/&amp;/g, '&')
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`no confirmation email for ${email}`)
}

/** Opens the link as a browser would; Supabase confirms the address and hands back a session. */
async function followConfirmation(link: string) {
  const response = await fetch(link, { redirect: 'manual' })
  const hash = new URLSearchParams((response.headers.get('location') ?? '').split('#')[1] ?? '')
  return { access_token: hash.get('access_token') ?? '', refresh_token: hash.get('refresh_token') ?? '' }
}

const roleOf = async (userId: string) => (await serviceClient().from('profiles').select('role').eq('id', userId).single()).data?.role

describe.skipIf(!stackAvailable)('customer accounts and booking (real Supabase, through the customer app modules)', () => {
  it('signs up, confirms the email from the real message, and becomes a customer with a profile', async () => {
    const app = customerApp()
    const email = `signup-${Date.now()}@stack.test`
    const password = 'a-long-password'
    expect(await app.account.signUp({ fullName: 'דניאל כהן', phone: '0541234567', email, password })).toEqual({ needsConfirmation: true })

    // Until the link is clicked the account cannot sign in.
    await expect(app.account.signIn(email, password)).rejects.toMatchObject({ code: 'email_not_confirmed' })

    const tokens = await followConfirmation(await confirmationLink(email))
    expect(tokens.access_token).not.toBe('')
    await app.db.auth.setSession(tokens)

    // The name and phone given at sign-up wait in the account until the profile is completed.
    expect(await app.account.getState()).toMatchObject({ status: 'needs-profile', suggested: { fullName: 'דניאל כהן', phone: '0541234567' } })
    await app.account.completeProfile({ fullName: 'דניאל כהן', phone: '0541234567' })
    expect(await app.account.getState()).toMatchObject({ status: 'ready', email, profile: { fullName: 'דניאל כהן', phone: '0541234567' } })

    const { data } = await app.db.auth.getUser()
    expect(await roleOf(data.user!.id)).toBe('customer')
  })

  it('never lets an account make itself staff', async () => {
    const service = serviceClient()
    const { data } = await service.auth.admin.createUser({
      email: `meta-${Date.now()}@stack.test`,
      password: 'a-long-password',
      email_confirm: true,
      user_metadata: { role: 'owner', full_name: 'מנסה' },
    })
    expect(await roleOf(data.user!.id)).toBe('customer')

    const app = await signedInCustomer('0549000001')
    const { data: me } = await app.db.auth.getUser()
    const { error } = await app.db.from('profiles').update({ role: 'owner' }).eq('id', me.user!.id)
    expect(error).not.toBeNull()
    expect(await roleOf(me.user!.id)).toBe('customer')
  })

  it('refuses a weak password and a phone number another account uses', async () => {
    const app = customerApp()
    await expect(
      app.account.signUp({ fullName: 'קצר', phone: '0541111111', email: `weak-${Date.now()}@stack.test`, password: 'short' }),
    ).rejects.toMatchObject({ code: 'weak_password' })

    await signedInCustomer('0549000002')
    await expect(signedInCustomer('054-900-0002')).rejects.toMatchObject({ code: 'phone_in_use' })
  })

  it('reads the real catalogue without signing in', async () => {
    const catalogue = await customerApp().catalogue.load()
    expect(catalogue.services.map((s) => s.id)).toContain(SERVICE.signature)
    expect(catalogue.barbers.find((b) => b.id === JACOB)).toMatchObject({ name: 'יעקב', active: true })
  })

  it('books, sees only its own appointments, is protected from double booking, reschedules and cancels', async () => {
    const [dana, eli] = [await signedInCustomer('0549000003'), await signedInCustomer('0549000004')]
    const day = sunday(2)
    const query = { serviceId: SERVICE.signature, barberId: JACOB, duration: 45 }

    const month = await dana.booking.getMonthAvailability(day.slice(0, 7), query)
    expect(month.find((d) => d.date === day)?.status).toBe('available')

    const slots = await dana.booking.getDaySlots(day, query)
    const booked = await dana.booking.createAppointment({ serviceId: SERVICE.signature, barberId: JACOB, start: at(day, slots[0].time) })
    expect(booked).toMatchObject({ barberId: JACOB, serviceId: SERVICE.signature, status: 'booked' })

    await expect(eli.booking.createAppointment({ serviceId: SERVICE.signature, barberId: JACOB, start: booked.start })).rejects.toMatchObject({ code: 'slot_unavailable' })
    expect((await dana.booking.getDaySlots(day, query)).map((s) => s.time)).not.toContain(slots[0].time)

    expect((await dana.booking.listAppointments()).map((a) => a.id)).toEqual([booked.id])
    expect(await eli.booking.listAppointments()).toEqual([])

    const later = slots[3].time
    const moved = await dana.booking.rescheduleAppointment(booked, { barberId: JACOB, start: at(day, later) })
    expect(new Date(moved.start).toISOString()).toBe(at(day, later))

    await dana.booking.cancelAppointment(booked.id)
    expect((await dana.booking.listAppointments())[0].status).toBe('cancelled')
    await expect(eli.booking.cancelAppointment(booked.id)).rejects.toBeDefined()
  })

  it('caps how many upcoming appointments one account can hold', async () => {
    const app = await signedInCustomer('0549000005')
    const day = sunday(3)
    const query = { serviceId: SERVICE.signature, barberId: JACOB, duration: 45 }
    const slots = await app.booking.getDaySlots(day, query)
    for (const slot of [slots[0], slots[2], slots[4]]) {
      await app.booking.createAppointment({ serviceId: SERVICE.signature, barberId: JACOB, start: at(day, slot.time) })
    }
    await expect(app.booking.createAppointment({ serviceId: SERVICE.signature, barberId: JACOB, start: at(day, slots[6].time) })).rejects.toMatchObject({
      code: 'booking_limit',
    })
  })

  it('explains that a day with free time needs no waiting list', async () => {
    const app = await signedInCustomer('0549000006')
    await expect(app.booking.joinWaitlist({ date: sunday(4), barberId: JACOB, serviceId: SERVICE.signature })).rejects.toMatchObject({ code: 'slots_available' })
  })
})
