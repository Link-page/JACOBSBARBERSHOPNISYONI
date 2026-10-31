import type { WaitlistReceipt, WaitlistRequest } from '../types'

const KEY = 'jacobs.waitlist.v1'

function read(): WaitlistReceipt[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as WaitlistReceipt[]
  } catch {
    return []
  }
}

const sameRequest = (a: WaitlistRequest, b: WaitlistRequest) =>
  a.date === b.date && a.barberId === b.barberId && a.serviceId === b.serviceId

/** Waitlist requests kept on this device only. */
export const waitlistStore = {
  find: (request: WaitlistRequest) => read().find((r) => sameRequest(r.request, request)),

  add(receipt: WaitlistReceipt) {
    try {
      localStorage.setItem(KEY, JSON.stringify([...read(), receipt]))
    } catch {
      // Storage unavailable (private mode): the receipt still exists for this session.
    }
  },
}
