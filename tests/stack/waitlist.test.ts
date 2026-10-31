import { describe, expect, it } from 'vitest'

import { at, createAccount, createOwner, expectAdminError, JACOB, SERVICE, signIn, stackAvailable, sunday, type Session } from './stack'

describe.skipIf(!stackAvailable)('waiting list (real Supabase): customer joins, staff manage, offer is claimed', () => {
  it('runs the full allocation policy', async () => {
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

    // Cancelling frees 10:00: the longest-waiting customer gets a held offer.
    await owner.api.appointments.cancel(booked.id, '')
    const after = await owner.api.waitlist.list(range)
    expect(after.find((e) => e.customerName === 'ראשון בתור')?.status).toBe('offered')
    expect(after.find((e) => e.customerName === 'שני בתור')?.status).toBe('waiting')
    expect((await owner.api.waitlist.outbox())[0]).toMatchObject({ status: 'pending', channel: 'sms' })
    expect(await owner.api.schedule.daySlots(SERVICE.signature, day, JACOB)).toEqual([])
    await expectAdminError(
      owner.api.appointments.create({ customerId: holder.id, barberId: JACOB, serviceId: SERVICE.signature, startsAt: at(day, '10:00'), notes: '' }),
      'slot_unavailable',
    )

    // Only the offered customer can claim, exactly once.
    const claim = await early.db.rpc('claim_waitlist_offer', { p_entry: entryId }).single<{ status: string }>()
    expect(claim.error).toBeNull()
    expect(claim.data?.status).toBe('booked')
    expect((await early.db.rpc('claim_waitlist_offer', { p_entry: entryId })).error?.message).toContain('offer_expired')

    // Staff remove the remaining request; maintenance has nothing to expire.
    const remaining = (await owner.api.waitlist.list(range)).find((e) => e.status === 'waiting')!
    await owner.api.waitlist.remove(remaining.id)
    expect(await owner.api.waitlist.list(range)).toEqual([])
    expect(await owner.api.waitlist.runMaintenance()).toBe(0)
  })
})
