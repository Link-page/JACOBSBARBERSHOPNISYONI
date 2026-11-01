# JACOB'S — Customer app: accounts and data

The customer app (`/`) runs against the same Supabase project as the admin.

When the build has the Supabase variables:
- customers sign in, or register with email and password plus name and Israeli mobile
- services, barbers and gallery photos come from the database
- bookings, changes, cancellations and waiting-list requests go through the same checked database functions as the admin

Without the variables (local development, or a build without them), it runs as an **on-device demo**:
- a sample customer and the sample catalogue
- nothing leaves the device, and the confirmation screens say so

## Architecture

```
src/
  backend/index.ts        the one place that picks Supabase or the on-device demo
  lib/supabase/           shared with the admin: key-safety config, client factory, Storage URLs
  lib/phone.ts            Israeli mobile validation (mirrors app.normalize_il_mobile in SQL)
  account/                customer accounts
    account-api.ts          contract · supabase-account.ts (real) · local-account.ts (demo)
    account-provider.tsx    session state · account-gate.tsx (sign-in until ready)
    validation.ts · errors.ts · use-profile-completion.ts · use-submit.ts
    screens/                sign-in, sign-up, check-email, complete-profile
  catalogue/              services, barbers, gallery (types, API, Supabase + demo, provider, icons)
  api/                    BookingApi contract, Supabase implementation, demo implementation, BookingError
  store/                  app state; use-appointments.ts reads/writes through the BookingApi
  components/carousel/    reusable centre-focused carousel (pure maths in carousel-math.ts)
  notifications/          in-app notification centre and Web Push (see notifications.md)
  features/confirmation/  attendance confirmation and the WhatsApp request button
  features/team/          team carousel and barber slide
  features/gallery/       gallery carousel, grid tile, viewer, empty state
  layout/                 responsive shell: tab bar (phones/tablets), top navigation (desktop)
```

Each customer app module depends on a contract (`AccountApi`, `CatalogueApi`, `BookingApi`), never on Supabase directly. Screens don't know which backend is behind them.

## Security model

- **Roles.** New accounts are always `customer`:
  - the role column defaults to it
  - the sign-up trigger ignores any role a user puts in their metadata
  - users cannot update the role column

  Tested in the database tests and on the Supabase stack.
- **Own data only.** Row-level security limits a customer to their own customer record, appointments and waiting-list requests.
- **Checked functions only.** Bookings, changes, cancellations and waiting-list requests can only be made through the database functions, which check availability inside a transaction. The exclusion constraint makes double booking impossible.
- **Profile completion.** `register_customer` (migration 0010) creates or updates only the caller's own customer record, and checks:
  - the name is 2–80 characters
  - the number is an Israeli mobile, stored as `05XXXXXXXX`
  - the number isn't already used by another account
- **Phone numbers are not verified, so they never unlock history.** An account is never linked to a customer record that staff created for the same number. Staff can see both records.
- **Abuse limits** for self-service (migration 0010). Staff are not limited.
  - at most **3 upcoming appointments** per account
  - at most **3 active waiting-list requests** per account
  - change them in `app.customer_limits()`
- **Email confirmation** is required before an account can sign in.
- **Separate sessions.** The customer app and the admin keep separate sessions in the browser, so signing in to one never signs anyone in to the other.

## Before opening registration (Supabase settings)

Public sign-up is **off** on the hosted project, and should stay off until every step below is done. They're manual dashboard steps, in this order.

1. **Install migration 0010.**
   - In *SQL Editor*, run `supabase/migrations/0010_customer_accounts.sql`.
   - The *Supabase verification* workflow reports "Customer accounts migration (0010) is installed" once it's there.
2. **Connect an email provider (custom SMTP).** *Authentication → Emails → SMTP Settings.*
   - Supabase's built-in email service is for testing only: it sends only to members of your Supabase organization, at a very low hourly limit.
   - Without your own SMTP provider (e.g. Resend, Postmark, Amazon SES or SendGrid), customers would never receive the confirmation email.
   - Use a sender address on a domain you control.
3. **Allow the app's return address.** *Authentication → URL Configuration → Redirect URLs*, add:
   - `https://link-page.github.io/JACOBSBARBERSHOPNISYONI/`
   - `http://localhost:5173/JACOBSBARBERSHOPNISYONI/` (local testing)

   The Site URL can stay the admin address.
4. **Password rules.** *Authentication → Sign In / Providers → Email*:
   - set *Minimum password length* to **8** (the app asks for 8)
   - keep *Confirm email* on
5. **Rate limits.** In *Authentication → Rate Limits*, review the defaults. After SMTP is connected, set *emails per hour* to a value that fits your expected sign-ups (for example 30–60).
6. **(Recommended) Confirmation email in Hebrew.** *Authentication → Emails → Templates → Confirm signup.*
7. **(Recommended, needs an app change) CAPTCHA.** Supabase supports Cloudflare Turnstile and hCaptcha under *Authentication → Attack Protection*.
   - The app does not send a CAPTCHA token yet, so turning this on now would block every sign-up.
   - Ask for the Turnstile integration first.
8. **Open registration.** Turn on *Allow new users to sign up* (*Authentication → Sign In / Providers*).
9. **Publish** (merge to `main`, with the owner's approval).
   - From then on the live customer app requires an account, and bookings go to the database.
   - Do it after step 8, otherwise visitors meet a sign-up that says registration is not open yet.

## Testing

| What | Runs against | Where |
| --- | --- | --- |
| Phone rules, form validation, error mapping, carousel maths, media URLs | Unit tests | `npm test` (CI) |
| Migration 0010, plus every earlier database rule | Postgres 16 with the migrations | `npm run test:db` (CI) |
| Customer sign-up, email confirmation, profile, booking flows, catalogue | A real local Supabase stack, through the customer app's own modules (details below) | `tests/stack/customer.test.ts`, *Supabase verification → local stack* |
| Notifications and attendance confirmation | Postgres, the local stack, Node + Deno, and browser QA | see [notifications.md → Tests](notifications.md#tests) |
| Hosted project | Read-only, signed out: public catalogue, private data closed, functions installed, Auth settings, migrations 0010–0016 present | *Supabase verification → hosted* |

The customer stack suite covers:
- **Sign-up and confirmation:** sign-up, then confirmation through the **real confirmation email** caught by Mailpit
- **Account protections:**
  - role always `customer`
  - no self-promotion
  - weak password and a number already used by another account refused
- **Booking:**
  - booking
  - own appointments only
  - double booking refused
  - rescheduling and cancelling
  - the booking limit
  - the "day still has free time" waiting-list rule

**Not covered automatically:**
- registering on the hosted project, because sign-up is closed there
- the real email from your SMTP provider

Check both by hand after steps 1–8.
