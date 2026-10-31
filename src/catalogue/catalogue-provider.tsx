import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { LoadError, Splash } from '@/components/app-status'

import type { CatalogueApi } from './catalogue-api'
import { CatalogueContext } from './catalogue-context'
import { catalogueValue } from './catalogue-lookup'
import type { Catalogue } from './types'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalogue: Catalogue }

/** Loads the catalogue once; the app renders only with real data (or an honest error). */
export function CatalogueProvider({ api, children }: { api: CatalogueApi; children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const fetchCatalogue = useCallback(
    () =>
      api.load().then(
        (catalogue) => setState({ status: 'ready', catalogue }),
        () => setState({ status: 'error' }),
      ),
    [api],
  )
  useEffect(() => void fetchCatalogue(), [fetchCatalogue])
  const retry = () => {
    setState({ status: 'loading' })
    void fetchCatalogue()
  }
  const value = useMemo(() => (state.status === 'ready' ? catalogueValue(state.catalogue) : null), [state])

  if (state.status === 'error') return <LoadError message="לא הצלחנו לטעון את פרטי המספרה. בדקו את החיבור לאינטרנט." onRetry={retry} />
  if (!value) return <Splash />
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}
