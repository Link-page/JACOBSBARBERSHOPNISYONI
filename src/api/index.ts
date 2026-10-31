import type { BookingApi } from './booking-api'
import { localBookingApi } from './local/local-booking-api'

/** The active booking backend. Swap in a server implementation here when one exists. */
export const api: BookingApi = localBookingApi

export type { BookingApi } from './booking-api'
export * from './types'
