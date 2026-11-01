/**
 * Reports what the hosted project still needs before publishing: Auth
 * settings, and whether the customer-account (0010) and notification
 * (0011–0016) migrations are installed.
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

/** Signed-out call: "permission denied" means the function exists; "not found" means the migration hasn't run. */
async function functionInstalled(name: string, body: object) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)
  if (!res) return null
  const error = (await res.json().catch(() => ({}))) as { code?: string }
  return error.code !== 'PGRST202'
}

function report(ok: boolean, good: string, warning: string) {
  console.log(ok ? `✓ ${good}` : `::warning title=Supabase Auth::${warning}`)
}

const providers = Object.entries(settings.external ?? {})
  .filter(([, enabled]) => enabled)
  .map(([name]) => name)
console.log(`Sign-in methods enabled: ${providers.join(', ') || 'none'}`)

const accounts = await functionInstalled('register_customer', { p_full_name: '', p_phone: '' })
report(
  accounts === true,
  'Customer accounts migration (0010) is installed.',
  accounts === null
    ? 'Could not check for migration 0010 (network error).'
    : 'Migration 0010_customer_accounts.sql is not installed: run it in the SQL Editor before opening customer registration.',
)
// Notifications and attendance confirmation (0011–0016). Functions they add answer "permission denied" when installed.
const notificationMarkers: [string, string, object][] = [
  ['0011_notifications.sql', 'save_push_subscription', { p_endpoint: 'https://x.invalid', p_p256dh: '', p_auth: '' }],
  ['0012_attendance.sql', 'confirm_attendance', { p_id: '00000000-0000-0000-0000-000000000000' }],
  ['0014_broadcasts.sql', 'send_broadcast', { p_title: '', p_body: '', p_audience: '', p_url: null, p_idempotency_key: '00000000-0000-0000-0000-000000000000' }],
]
const missingMigrations: string[] = []
for (const [migration, fn, body] of notificationMarkers) {
  if ((await functionInstalled(fn, body)) === false) missingMigrations.push(migration)
}
report(
  missingMigrations.length === 0,
  'Notification and attendance migrations (0011, 0012, 0014) are installed. Confirm 0013, 0015 and 0016 with the SQL check in docs/notifications.md.',
  `Not installed: ${missingMigrations.join(', ')}. Run 0011–0016 in order in the SQL Editor (docs/notifications.md) BEFORE publishing this version: the app reads the new columns.`,
)

// Public sign-up is the goal for customers, but only once the per-customer limits (0010) exist.
const signupOpen = settings.disable_signup !== true
report(
  !signupOpen || accounts === true,
  signupOpen ? 'Public sign-up is on, with per-customer limits installed.' : 'Public sign-up is off. Open it when docs/customer-app.md "Before opening registration" is done.',
  'Public sign-up is ON without migration 0010: accounts can be created with no per-customer booking limits. Turn off "Allow new users to sign up" (Authentication → Sign In / Providers) or run the migration.',
)
report(
  settings.mailer_autoconfirm !== true,
  'New email accounts must confirm their address.',
  'Email confirmation is OFF: new accounts are active without proving they own the address. Turn on "Confirm email" (Authentication → Sign In / Providers → Email).',
)
