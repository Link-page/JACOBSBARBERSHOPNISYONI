# JACOB'S — Admin system

Staff management for the barbershop: dashboard, calendar, appointments, waiting lists, team, services, customers and business settings. It runs on desktop and on iPhone, in Hebrew RTL.

- **URL:** `/admin/` (production: https://link-page.github.io/JACOBSBARBERSHOPNISYONI/admin/ once deployed from `main`).
- **Status:** the admin and the database layer are built and tested. The admin is **not connected to a live backend yet**; follow [Setup](#setup) to connect it.

## Architecture

| Layer | Where | Responsibility |
| --- | --- | --- |
| Database | `supabase/migrations/` | Schema, constraints, availability, booking and waiting-list functions, row-level security, audit trail |
| Domain logic | `src/booking/` | Pure scheduling rules (`schedule-engine.ts`), calendar maths, day parts |
| Admin data access | `src/admin/data/` | The `AdminApi` contract, its Supabase implementation, and a development-only prototype |
| Admin UI | `src/admin/` | Auth gate, desktop and phone layouts, feature screens |

### Why Supabase

GitHub Pages serves static files only, so bookings and administration need a hosted backend.

**Supabase** (managed Postgres, Auth and Storage) fits this project:

- **Correctness at the database:** Postgres exclusion constraints make double booking impossible, and transactions plus row locks make simultaneous requests safe.
- **Security without our own server:** row-level security and `SECURITY DEFINER` functions enforce permissions in the database. The static site can talk to it directly using only the public anon key.
- **Built-in pieces:** Auth (sessions, password reset, invites, MFA) and Storage (photos, logo, gallery).
- **Cost:** the free tier is enough to start, and the paid tier is predictable.

**Trade-offs:**
- business logic lives partly in SQL, which is less familiar than TypeScript to some developers
- you're tied to one vendor for Auth, though the data is plain Postgres and portable
- scheduled jobs (offer expiry) need `pg_cron`

**Alternatives considered:**
- **Firebase:** document storage makes overlap constraints and transactions across many records awkward.
- **A custom Node API:** full control, but another server to run, secure and patch.

### Security model

- **The browser holds only the project URL and the anon key.** Both are public by design. The `service_role` key must never appear in the app, `.env` files committed to git, or GitHub variables.
- **Default deny.** All table privileges are revoked, then the minimum is granted back. Row-level security is on for all 15 tables.
- **Roles live in `profiles.role`:** `owner`, `barber` or `customer`. New accounts are customers. Only an owner can change roles, through `admin_set_user_role`, and the last owner can't demote themselves.
- **Appointments and waiting-list entries can only be written through database functions.** Each function:
  - checks the caller's role
  - takes a per-barber lock
  - re-validates availability inside the transaction
  - relies on the exclusion constraint as the final guard
- **Barbers see only their own chair:** its appointments, the customers they serve, and their own time blocks. Customers see only their own records. Anonymous visitors see only the public catalogue and free time slots.
- **Owner only:** business settings, services, prices, team, closed dates, the outbox and the audit log.
- **The audit log** records every change to appointments, the catalogue, customers and settings, with the acting user.
- **Hiding `/admin` is not security, and it isn't relied on.** The admin page is `noindex`, but every request is authorised by the database.

### Booking rules (enforced in SQL, mirrored in `src/booking/schedule-engine.ts`)

A time is bookable for a barber only if all of these hold:
- it falls inside their working hours for that weekday
- it doesn't touch a break
- it doesn't overlap a time block, either the barber's own or a shop-wide closure
- it doesn't overlap another active appointment
- it isn't held by an open waiting-list offer

Service length comes from the barber's own duration for that service when set, otherwise the service default.

Customers also have to respect:
- the slot grid
- the minimum lead time
- the booking window
- the cancellation notice period

### Waiting list policy

1. **Joining:** a customer can join only for a day with no free slot for their service and barber choice. There's one active request per customer, service, day and barber choice.
2. **Offers:** when time frees up through a cancellation, a reschedule or an expired offer, waiting requests for that day are considered oldest first. Each gets at most one offer: the earliest slot that fits.
3. **Holds:** an open offer holds its slot for that customer until it expires (default 120 minutes), so a slot is never promised twice.
4. **Claiming:** the customer claims the offer with `claim_waitlist_offer`, which books it atomically.
5. **Expiry:** `run_waitlist_maintenance` expires unclaimed offers and passes the time to the next request. Run it on a schedule (see setup); staff can also trigger it from the admin.
6. **Notifications:** each offer queues a message in `notifications` with status `pending`. **Nothing is sent: no SMS or WhatsApp provider is connected.** The admin says so plainly, and staff should phone the customer.

## Setup

These steps are needed before the admin can be used for real.

1. **Create a Supabase project** at https://supabase.com, choosing a region near Israel (e.g. Frankfurt). From *Project Settings → API*, note the **Project URL** and the **anon public** key. Never use the `service_role` key in this app.

2. **Create the database.** Either use the Supabase CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push --include-seed
   ```
   Or, in the dashboard's *SQL Editor*, run every file in `supabase/migrations/` in order (0001 → 0009), then `supabase/seed.sql`.

3. **Configure authentication.** Under *Authentication → Providers*, keep Email enabled. Until the customer app uses accounts, turn off *Allow new users to sign up* and invite staff from *Authentication → Users → Invite*. Under *URL Configuration*, set the Site URL to `https://link-page.github.io/JACOBSBARBERSHOPNISYONI/admin/`.

4. **Make the first owner.** After Jacob accepts the invite and sets a password, run this in the SQL Editor (with his real email):
   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'JACOB_EMAIL');
   update public.barbers set user_id = (select id from auth.users where email = 'JACOB_EMAIL')
   where id = '11111111-1111-4111-8111-111111111111';
   ```
   Future barbers: invite them, then link them from *Team → (barber) → Admin access* in the admin.

5. **Schedule offer expiry.** Enable the `pg_cron` extension under *Database → Extensions*, then run:
   ```sql
   select cron.schedule('waitlist-maintenance', '*/5 * * * *', 'select public.run_waitlist_maintenance()');
   ```

6. **Connect the website build.** In GitHub, go to *Settings → Secrets and variables → Actions → Variables* and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The deploy workflow passes them to the build.

7. **Local development against Supabase:** copy `.env.example` to `.env.local` and fill in the same two values. `.env.local` is git-ignored.

## Development

```bash
npm run dev        # admin at http://localhost:5173/JACOBSBARBERSHOPNISYONI/admin/
npm test           # unit tests (scheduling, permissions, statistics, calendar ranges)
npm run test:db    # database tests — needs a disposable Postgres 16, see below
npm run lint && npm run build
```

**Without Supabase configured,** `npm run dev` runs the admin on a **development prototype**: in-memory sample data with a visible banner and an owner/barber role switch. It applies the same rules, resets on reload, and is never included in production builds. A production build without Supabase shows only a setup notice: no login and no data.

**Database tests** run the real migrations against Postgres, with a small shim emulating Supabase's `auth.uid()` and API roles. They cover:
- availability
- booking and simultaneous booking
- appointment changes and the notice period
- access control for every role
- the waiting list
- owner operations

Locally, set `TEST_DATABASE_URL` to a superuser connection on a throwaway server; the default is `postgres://postgres@127.0.0.1:54329/postgres`. The tests drop and recreate a `jacobs_test` database. CI runs them against a Postgres 16 service.

## Not done yet

- **The customer app is not connected to Supabase yet.** It still uses its on-device demo data. Connecting it needs:
  - a short contact-details step (name and phone) with anonymous or phone sign-in
  - loading services and team from the database

  The database functions it needs already exist and are tested: `book_appointment`, `join_waitlist`, `claim_waitlist_offer`, `cancel_appointment`.
- **No SMS or WhatsApp provider is connected.** Offers are queued but not sent.
- **Not tested against a live Supabase project.** The admin's Supabase adapter is type-checked; the SQL is tested on Postgres 16 with an auth shim.
- **Missing admin features:**
  - MFA enrolment and password reset screens. Use the Supabase dashboard meanwhile.
  - Barbers editing their own breaks. The database allows it; the screen is owner-only for now.
- **Time zone:** the admin uses the device time zone, which is assumed to be the shop's (`Asia/Jerusalem`).
