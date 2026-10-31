/**
 * After `npm run build` with the Supabase variables set: proves the build read
 * both variables (shared by the customer app and the admin) and that no secret
 * key of either format was compiled in. Prints file names and yes/no results
 * only — never the values.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
if (!url || !key) {
  console.error('✗ Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running this check.')
  process.exit(1)
}

const dir = path.resolve(import.meta.dirname, '../dist/assets')
const files = readdirSync(dir).filter((f) => f.endsWith('.js'))
const read = (f: string) => readFileSync(path.join(dir, f), 'utf8')

const withUrl = files.filter((f) => read(f).includes(url))
const withKey = files.filter((f) => read(f).includes(key))
// New-format secret keys, and legacy JWTs whose payload says "service_role" (base64: c2VydmljZV9yb2xl).
const withSecret = files.filter((f) => /sb_secret_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl/.test(read(f)))

let ok = true
const report = (label: string, pass: boolean, detail = '') => {
  console.log(`${pass ? '✓' : '✗'} ${label}${detail ? ` (${detail})` : ''}`)
  ok &&= pass
}
report('project URL compiled in', withUrl.length > 0, withUrl.join(', '))
report('publishable key compiled in', withKey.length > 0, withKey.join(', '))
report('no secret or service-role key in any bundle', withSecret.length === 0)
process.exit(ok ? 0 : 1)
