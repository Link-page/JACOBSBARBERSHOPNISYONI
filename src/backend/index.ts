import type { AccountApi } from '@/account/account-api'
import { localAccount } from '@/account/local-account'
import { createSupabaseAccount } from '@/account/supabase-account'
import type { BookingApi } from '@/api/booking-api'
import { localBookingApi } from '@/api/local/local-booking-api'
import { createSupabaseBookingApi } from '@/api/supabase/supabase-booking-api'
import type { CatalogueApi } from '@/catalogue/catalogue-api'
import { localCatalogue } from '@/catalogue/local-catalogue'
import { createSupabaseCatalogue } from '@/catalogue/supabase-catalogue'
import { createSupabaseClient } from '@/lib/supabase/client'
import { supabaseConfigState } from '@/lib/supabase/config'

export type Backend = { booking: BookingApi; catalogue: CatalogueApi; account: AccountApi }

function supabaseBackend(): Backend {
  // One client (one session) shared by bookings, catalogue and account.
  const db = createSupabaseClient('jacobs.customer.session')
  // Confirmation emails bring the customer back to this app's own address.
  const appUrl = new URL(import.meta.env.BASE_URL, location.origin).href
  return { booking: createSupabaseBookingApi(db), catalogue: createSupabaseCatalogue(db), account: createSupabaseAccount(db, appUrl) }
}

const demoBackend: Backend = { booking: localBookingApi, catalogue: localCatalogue, account: localAccount }

/**
 * Chosen once at start-up: Supabase when the build carries a safe configuration
 * (URL + publishable key), otherwise the on-device demo. An unsafe or malformed
 * configuration is never used.
 */
export const backend: Backend = supabaseConfigState === 'ready' ? supabaseBackend() : demoBackend
