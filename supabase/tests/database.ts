import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import pg from 'pg'

/** Server used for the throwaway test database. Never point this at production. */
export const SERVER_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres'
export const TEST_DB = 'jacobs_test'
export const JACOB = '11111111-1111-4111-8111-111111111111'
export const SERVICE = {
  signature: '22222222-0000-4000-8000-000000000001',
  fade: '22222222-0000-4000-8000-000000000002',
  cutBeard: '22222222-0000-4000-8000-000000000003',
  beard: '22222222-0000-4000-8000-000000000004',
} as const

const root = path.resolve(import.meta.dirname, '..')

/** Recreates the test database from the shim, every migration except storage, and the seed. */
export async function createTestDatabase() {
  const server = new pg.Client({ connectionString: SERVER_URL })
  await server.connect()
  await server.query(`drop database if exists ${TEST_DB} with (force)`)
  await server.query(`create database ${TEST_DB}`)
  await server.end()

  const db = new pg.Client({ connectionString: testDatabaseUrl() })
  await db.connect()
  await db.query(readFileSync(path.join(root, 'tests/supabase-shim.sql'), 'utf8'))
  const migrations = readdirSync(path.join(root, 'migrations'))
    .filter((f) => f.endsWith('.sql') && !f.includes('storage')) // Supabase Storage isn't emulated
    .sort()
  for (const file of migrations) {
    try {
      await db.query(readFileSync(path.join(root, 'migrations', file), 'utf8'))
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`)
    }
  }
  await db.query(readFileSync(path.join(root, 'seed.sql'), 'utf8'))
  await db.end()
}

export function testDatabaseUrl() {
  const url = new URL(SERVER_URL)
  url.pathname = `/${TEST_DB}`
  return url.toString()
}
