import { createTestDatabase } from './database'

export default async function setup() {
  await createTestDatabase()
}
