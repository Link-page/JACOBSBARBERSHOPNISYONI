import { defineConfig } from 'vitest/config'

/** Database tests: run against a disposable Postgres (see supabase/tests/database.ts). */
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    globalSetup: ['supabase/tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
})
