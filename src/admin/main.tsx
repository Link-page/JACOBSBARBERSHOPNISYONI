import '@fontsource-variable/frank-ruhl-libre'
import '@fontsource-variable/heebo'
import '@/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { SetupRequiredScreen } from './auth/auth-screens'
import { isSupabaseConfigured } from './data/config'

/**
 * Chooses the backend:
 *  - Supabase when the build is configured with a project URL and anon key;
 *  - the in-memory prototype only in development (`npm run dev`), never in production builds;
 *  - otherwise a setup notice — no data and no login.
 */
async function start() {
  const root = createRoot(document.getElementById('root')!)

  if (isSupabaseConfigured) {
    const [{ AdminApp }, { supabaseAdminApi }] = await Promise.all([import('./admin-app'), import('./data/supabase')])
    root.render(
      <StrictMode>
        <AdminApp api={supabaseAdminApi} />
      </StrictMode>,
    )
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
