import type { AvailabilityQuery } from '@/api'
import { backend } from '@/backend'

import { useQuery } from './use-query'

/** Availability older than five minutes is fetched again. */
const freshness = () => Math.floor(Date.now() / 300_000)
const queryKey = (q: AvailabilityQuery) => `${q.serviceId}|${q.barberId}|${q.duration}|${freshness()}`

export function useMonthAvailability(month: string, query: AvailabilityQuery | null) {
  return useQuery(query && `availability|month|${month}|${queryKey(query)}`, () =>
    backend.booking.getMonthAvailability(month, query!),
  )
}

export function useDaySlots(date: string | undefined, query: AvailabilityQuery | null) {
  return useQuery(query && date ? `availability|day|${date}|${queryKey(query)}` : null, () =>
    backend.booking.getDaySlots(date!, query!),
  )
}

export function useNextAvailable(query: AvailabilityQuery | null) {
  return useQuery(query && `availability|next|${queryKey(query)}`, () => backend.booking.getNextAvailable(query!))
}
