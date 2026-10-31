import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { createAppointments } from './appointments'
import { createAuth } from './auth'
import { createBarbers, createServices } from './catalogue'
import { createCustomers } from './customers'
import { createSchedule } from './schedule'
import { createSettings } from './settings'
import { createWaitlist } from './waitlist'

/**
 * The production backend: Supabase (Postgres + Auth + Storage), bound to one
 * client. The browser passes its session-persisting client; tests pass a client
 * per signed-in user.
 */
export function createSupabaseAdminApi(db: SupabaseClient): AdminApi {
  return {
    mode: 'supabase',
    auth: createAuth(db),
    appointments: createAppointments(db),
    schedule: createSchedule(db),
    waitlist: createWaitlist(db),
    barbers: createBarbers(db),
    services: createServices(db),
    customers: createCustomers(db),
    settings: createSettings(db),
  }
}
