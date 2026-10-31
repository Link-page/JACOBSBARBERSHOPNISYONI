import { createSupabaseAccount } from '@/account/supabase-account'
import { createSupabaseBookingApi } from '@/api/supabase/supabase-booking-api'
import { createSupabaseCatalogue } from '@/catalogue/supabase-catalogue'
import { createSupabaseNotifications } from '@/notifications/supabase-notifications'

import { browserClient, createAccount, type Account } from './stack'

/** The customer app as it runs in a browser: one client shared by its modules. */
export function customerApp() {
  const db = browserClient()
  return {
    db,
    account: createSupabaseAccount(db, 'http://127.0.0.1:3000/'),
    booking: createSupabaseBookingApi(db),
    catalogue: createSupabaseCatalogue(db),
    notifications: createSupabaseNotifications(db),
  }
}

/** A confirmed account signed in to the customer app with a complete profile. */
export async function signedInCustomer(phone: string, existing?: Account) {
  const account = existing ?? (await createAccount('customer'))
  const app = customerApp()
  await app.account.signIn(account.email, account.password)
  await app.account.completeProfile({ fullName: `לקוח ${phone.slice(-4)}`, phone })
  return app
}
