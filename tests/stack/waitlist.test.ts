import { describe, expect, it } from 'vitest'

import { at, createAccount, createOwner, expectAdminError, JACOB, SERVICE, signIn, stackAvailable, sunday, type Session } from './stack'

describe.skipIf(!stackAvailable)('waiting list (real Supabase): everyone is notified, the first booking wins', () => {
  it('notifies every waiting customer, holds nothing, and lets exactly one win the race', async () => {
    const owner = await signIn(await createOwner())
    const day = sunday(2)

    // Leave only 10:00–10:45 open for Jacob, then book it: the day is full.
    await owner.api.schedule.addBlock({ barberId: JACOB, startsAt: at(day, '07:00'), endsAt: at(day, '10:00'), reason: '' })
    await owner.api.schedule.addBlock({ barberId: JACOB, startsAt: at(day, '10:45'), endsAt: at(day, '22:00'), reason: '' })
    const holder = await owner.api.customers.upsert('מחזיק התור', '050-333-0001')
    const booked = await owner.api.appointments.create({ customerId: holder.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: at(day, '10:00'), notes: '' })
    expect(await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).toEqual([])

    // Customers join through the customer-facing database function.
    const early = await signIn(await createAccount('customer'))
    const late = await signIn(await createAccount('customer'))
    const join = (s: Session, name: string) =>
      s.db.rpc('join_waitlist', { p_service: SERVICE.signature, p_date: day, p_barber: JACOB, p_full_name: name, p_phone: null })
    const first = await join(early, 'ראשון בתור')
    expect(first.error).toBeNull()
    expect(first.data.already_on_list).toBe(false)
    expect((await join(early, 'ראשון בתור')).data.already_on_list).toBe(true)
    expect((await join(late, 'שני בתור')).error).toBeNull()
    const entryId: string = first.data.entry.id

    const range = { from: day, to: sunday(3) }
    expect((await owner.api.waitlist.list(range)).map((e) => e.customerName)).toEqual(['ראשון בתור', 'שני בתור'])
    expect((await late.db.rpc('remove_waitlist_entry', { p_entry: entryId })).error?.message).toContain('forbidden')

    // Cancelling frees 10:00: every waiting customer is told, and nothing is held for anyone.
    await owner.api.appointments.cancel(booked.id, '')
    for (const customer of [early, late]) {
      const { data } = await customer.db.from('inbox_messages').select('category, url')
      expect(data).toEqual([{ category: 'waitlist_available', url: expect.stringContaining(`date=${day}`) }])
    }
    expect((await owner.api.waitlist.list(range)).map((e) => e.status)).toEqual(['waiting', 'waiting'])
    expect((await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).map((s) => s.startsAt)).toContain(at(day, '10:00'))

    // Both try to book it at once: exactly one wins; the other hears the time is taken.
    const book = (s: Session) => s.db.rpc('book_appointment', { p_service: SERVICE.signature, p_starts_at: at(day, '10:00'), p_barber: JACOB })
    const results = await Promise.all([book(early), book(late)])
    expect(results.filter((r) => r.error === null)).toHaveLength(1)
    expect(results.find((r) => r.error)?.error?.message).toContain('slot_unavailable')
    const statuses = (await owner.api.waitlist.list(range)).map((e) => e.status)
    expect(statuses).toEqual(['waiting']) // the winner left the list by booking the day

    // Exclusive offers are retired.
    expect((await early.db.rpc('claim_waitlist_offer', { p_entry: entryId })).error?.message).toContain('offers_retired')
    await expectAdminError(owner.api.waitlist.remove('00000000-0000-4000-8000-000000000000'), 'not_found')
    expect(await owner.api.waitlist.runMaintenance()).toBeGreaterThanOrEqual(0)
  })
})
