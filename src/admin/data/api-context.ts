import { createContext, useContext } from 'react'

import { useQuery } from '@/hooks/use-query'

import type { AdminApi } from './admin-api'

type DataContextValue = { api: AdminApi; version: number; refresh: () => void }

export const DataContext = createContext<DataContextValue | null>(null)

export function useAdminData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useAdminData must be used inside <AdminDataProvider>')
  return ctx
}

export const useAdminApi = () => useAdminData().api

/** Cached, race-safe admin query that re-runs after any mutation (see AdminDataProvider.refresh). */
export function useAdminQuery<T>(key: string | null, load: (api: AdminApi) => Promise<T>) {
  const { api, version } = useAdminData()
  return useQuery(key === null ? null : `admin|${version}|${key}`, () => load(api))
}
