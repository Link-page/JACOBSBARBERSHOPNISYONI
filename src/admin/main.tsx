import '@fontsource-variable/frank-ruhl-libre'
import '@fontsource-variable/heebo'
import '@/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { SetupRequiredScreen } from './auth/auth-screens'
import { supabaseConfigState } from '@/lib/supabase/config'

/**
 * Chooses the backend:
 *  - Supabase when the build has a project URL and a browser-safe (publishable) key;
 *  - the in-memory prototype only in development (`npm run dev`), never in production builds;
 *  - otherwise a setup notice — no data and no login.
 */
async function start() {
  const root = createRoot(document.getElementById('root')!)

  if (supabaseConfigState === 'ready') {
    const [{ AdminApp }, { createSupabaseAdminApi }, { createBrowserClient }] = await Promise.all([
      import('./admin-app'),
      import('./data/supabase'),
      import('./data/supabase/client'),
    ])
    root.render(
      <StrictMode>
        <AdminApp api={createSupabaseAdminApi(createBrowserClient())} />
      </StrictMode>,
    )
  } else if (supabaseConfigState !== 'missing') {
    // Never fall back to the prototype when a backend is configured but unusable.
    root.render(<SetupRequiredScreen reason={supabaseConfigState} />)
  } else if (import.meta.env.DEV) {
    const [{ AdminApp }, { createPrototypeApi }] = await Promise.all([import('./admin-app'), import('./data/prototype')])
    const prototype = createPrototypeApi()
    root.render(
      <StrictMode>
        <AdminApp api={prototype.api} prototype={prototype} />
      </StrictMode>,
    )
  } else {
    root.render(<SetupRequiredScreen />)
  }
}

void start()
