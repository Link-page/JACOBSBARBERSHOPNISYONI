/**
 * Reports the hosted project's Auth posture before the admin is published.
 * Read-only: it calls the public settings endpoint the sign-in form itself
 * uses, with the publishable key, and never prints the URL or the key.
 * Findings are GitHub warnings, not failures: they are dashboard settings
 * for the owner to change, not code problems.
 *   node scripts/report-hosted-auth.ts
 */
import { classifySupabaseKey, isBrowserSafeKey, isValidSupabaseUrl } from '../src/lib/supabase-key.ts'

interface AuthSettings {
  disable_signup?: boolean
  mailer_autoconfirm?: boolean
  external?: Record<string, boolean>
}

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

if (!isValidSupabaseUrl(url) || !isBrowserSafeKey(classifySupabaseKey(key))) {
  console.log('Skipped: the Supabase variables are missing or not browser-safe.')
  process.exit(0)
}

const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).catch(() => null)
if (!response?.ok) {
  console.log(`::warning title=Auth settings::Could not read the Auth settings (${response ? `HTTP ${response.status}` : 'network error'}).`)
  process.exit(0)
}
const settings = (await response.json()) as AuthSettings

function report(ok: boolean, good: string, warning: string) {
  console.log(ok ? `✓ ${good}` : `::warning title=Supabase Auth::${warning}`)
}

const providers = Object.entries(settings.external ?? {})
  .filter(([, enabled]) => enabled)
  .map(([name]) => name)
console.log(`Sign-in methods enabled: ${providers.join(', ') || 'none'}`)

report(
  settings.disable_signup === true,
  'Public sign-up is disabled (staff are invited).',
  'Public sign-up is ON: anyone can create an account and call the booking functions directly. Until the customer app uses accounts, turn off "Allow new users to sign up" (Authentication → Sign In / Providers).',
)
report(
  settings.mailer_autoconfirm !== true,
  'New email accounts must confirm their address.',
  'Email confirmation is OFF: new accounts are active without proving they own the address. Turn on "Confirm email" (Authentication → Sign In / Providers → Email).',
)
