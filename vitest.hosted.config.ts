import path from 'node:path'
import { defineConfig } from 'vitest/config'

/** Read-only checks against the hosted Supabase project (anonymous access only), run in CI. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/hosted/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
