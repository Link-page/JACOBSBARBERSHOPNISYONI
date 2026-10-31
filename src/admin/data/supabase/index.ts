import type { AdminApi } from '../admin-api'
import { appointments } from './appointments'
import { auth } from './auth'
import { barbers, services } from './catalogue'
import { customers } from './customers'
import { schedule } from './schedule'
import { settings } from './settings'
import { waitlist } from './waitlist'

/** The production backend: Supabase (Postgres + Auth + Storage). */
export const supabaseAdminApi: AdminApi = {
  mode: 'supabase',
  auth,
  appointments,
  schedule,
  waitlist,
  barbers,
  services,
  customers,
  settings,
}
