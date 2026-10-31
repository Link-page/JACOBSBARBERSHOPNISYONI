import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { invalidateQueries } from '@/hooks/use-query'

import type { AdminApi } from './admin-api'
import { DataContext } from './api-context'

/** Provides the backend and a refresh signal that re-runs every admin query after a change. */
export function AdminDataProvider({ api, children }: { api: AdminApi; children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => {
    invalidateQueries('admin|')
    setVersion((v) => v + 1)
  }, [])
  const value = useMemo(() => ({ api, version, refresh }), [api, version, refresh])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
