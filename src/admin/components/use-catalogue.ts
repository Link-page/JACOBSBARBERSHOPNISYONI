import { useMemo } from 'react'

import { useAdminQuery } from '../data/api-context'

/** Barbers and services with name lookups, shared by every screen. */
export function useCatalogue() {
  const barbers = useAdminQuery('barbers', (api) => api.barbers.list())
  const services = useAdminQuery('services', (api) => api.services.list())
  return useMemo(() => {
    const barberMap = new Map((barbers.data ?? []).map((b) => [b.id, b]))
    const serviceMap = new Map((services.data ?? []).map((s) => [s.id, s]))
    return {
      barbers: barbers.data ?? [],
      services: services.data ?? [],
      loading: barbers.loading || services.loading,
      barber: (id: string | null) => (id ? barberMap.get(id) : undefined),
      service: (id: string) => serviceMap.get(id),
      barberName: (id: string | null) => (id ? (barberMap.get(id)?.name ?? '—') : 'כל ספר'),
      serviceName: (id: string) => serviceMap.get(id)?.name ?? '—',
    }
  }, [barbers.data, services.data, barbers.loading, services.loading])
}
