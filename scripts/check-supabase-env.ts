/**
 * Validates the Supabase build variables WITHOUT printing their values
 * (GitHub repository variables are not masked in logs).
 *   node scripts/check-supabase-env.ts            — fails only on unsafe or malformed values
 *   node scripts/check-supabase-env.ts --require  — also fails when they are missing
 */
import { classifySupabaseKey, isValidSupabaseUrl } from '../src/lib/supabase-key.ts'

const required = process.argv.includes('--require')
const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (!url && !key) {
  if (required) fail('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set.')
  console.log('Supabase is not configured: the admin will show its setup notice.')
  process.exit(0)
}
if (!url) fail('VITE_SUPABASE_URL is empty.')
if (!key) fail('VITE_SUPABASE_ANON_KEY is empty.')
if (!isValidSupabaseUrl(url)) fail('VITE_SUPABASE_URL must be an https:// project URL with no path.')

const kind = classifySupabaseKey(key)
if (kind === 'secret') {
  fail('VITE_SUPABASE_ANON_KEY holds a SECRET or service-role key. It must never reach the browser: rotate it in Supabase and use the publishable key (sb_publishable_…).')
}
if (kind === 'invalid') fail('VITE_SUPABASE_ANON_KEY is not a publishable (sb_publishable_…) or legacy anon key.')

console.log(`✓ Supabase build variables are valid (URL format OK, key type: ${kind}).`)
