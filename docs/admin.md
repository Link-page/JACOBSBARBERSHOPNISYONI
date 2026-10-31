# JACOB'S — Admin system

Staff management for the barbershop: dashboard, calendar, appointments, waiting lists, team, services, customers and business settings. It runs on desktop and on iPhone, in Hebrew RTL.

- **URL:** `/admin/` (production: https://link-page.github.io/JACOBSBARBERSHOPNISYONI/admin/ once deployed from `main`).
- **Status:**
  - The admin is wired to Supabase Auth and the database.
  - It has been verified against a real Supabase stack in CI, and read-only against the hosted project.
  - It is **not published**: `main` does not contain it yet.
  - See [Verification](#verification) and [Before publishing](#before-publishing).

## Architecture

| Layer | Where | Responsibility |
| --- | --- | --- |
| Database | `supabase/migrations/` | Schema, constraints, availability, booking and waiting-list functions, row-level security, audit trail |
| Domain logic | `src/booking/` | Pure scheduling rules (`schedule-engine.ts`), calendar maths, day parts |
| Admin data access | `src/admin/data/` | The `AdminApi` contract, its Supabase implementation (`supabase/`, one factory per area, bound to a client), and a development-only prototype |
| Admin UI | `src/admin/` | Auth gate, desktop and phone layouts, feature screens |
| Key policy | `src/lib/supabase-key.ts` | Tells publishable, legacy anon, secret and malformed keys apart; shared by the admin and the build checks |

### Why Supabase

GitHub Pages serves static files only, so bookings and administration need a hosted backend.

**Supabase** (managed Postgres, Auth and Storage) fits this project:

- **Correctness at the database:** Postgres exclusion constraints make double booking impossible, and transactions plus row locks make simultaneous requests safe.
- **Security without our own server:** row-level security and `SECURITY DEFINER` functions enforce permissions in the database. The static site talks to it directly using only the public publishable key.
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

- **The browser holds only the project URL and the publishable key** (`sb_publishable_…`; a legacy `anon` JWT also works).
  - Both are public by design. They appear in the website's JavaScript and in GitHub Actions logs, because repository variables are not masked.
  - Secret keys (`sb_secret_…`) and the legacy `service_role` key must never appear in the app, in committed `.env` files or in GitHub variables. The project enforces this in three places:
    - `scripts/check-supabase-env.ts` fails the deploy if one is configured
    - `scripts/check-admin-bundle.ts` fails if any bundle contains one
    - the admin refuses to start with one
- **Default deny.** All table privileges are revoked, then the minimum is granted back. Row-level security is on for all 15 tables.
- **Roles live in `profiles.role`:** `owner`, `barber` or `customer`. New accounts are customers. Only an owner can change roles, through `admin_set_user_role`, and the last owner can't demote themselves.
- **Appointments and waiting-list entries can only be written through database functions.** Each function:
  - checks the caller's role
  - takes a per-barber lock
  - re-validates availability inside the transaction
  - relies on the exclusion constraint as the final guard
- **Barbers see only their own chair:** its appointments, the customers they serve, and their own time blocks. Customers see only their own records. Anonymous visitors see only the public catalogue and free time slots.
- **Owner only:** business settings, services, prices, team, closed dates, the outbox and the audit log.
- **Refused writes are reported, not swallowed.** Row-level security filters forbidden rows out of an update or delete silently. The adapter treats "zero rows changed" as `forbidden`, so staff never see "saved" for a change that didn't happen.
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

1. **Joining:** a customer can join only for a day with no free slot for their service and barber choice. There's one active request per customer, service, day and barber choice. Staff can view, offer and remove requests, but they don't create them.
2. **Offers:** when time frees up through a cancellation, a reschedule or an expired offer, waiting requests for that day are considered oldest first. Each gets at most one offer: the earliest slot that fits.
3. **Holds:** an open offer holds its slot for that customer until it expires (default 120 minutes), so a slot is never promised twice.
4. **Claiming:** the customer claims the offer with `claim_waitlist_offer`, which books it atomically.
5. **Expiry:** `run_waitlist_maintenance` expires unclaimed offers and passes the time to the next request. Run it on a schedule (see setup); staff can also trigger it from the admin.
6. **Notifications:** each offer queues a message in `notifications` with status `pending`. **Nothing is sent: no SMS or WhatsApp provider is connected.** The admin says so plainly, and staff should phone the customer.

## Setup

These steps are needed before the admin can be used for real.

1. **Create a Supabase project** at https://supabase.com, choosing a region near Israel (e.g. Frankfurt).
   - From *Project Settings → API Keys*, note the **Project URL** and the **publishable** key (`sb_publishable_…`).
   - Never use a secret key (`sb_secret_…`) or the `service_role` key in this app.

2. **Create the database.** Either use the Supabase CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push --include-seed
   ```
   Or, in the dashboard's *SQL Editor*, run every file in `supabase/migrations/` in order (0001 → 0009), then `supabase/seed.sql`.

3. **Configure authentication.**
   - **Sign-in methods:** under *Authentication → Sign In / Providers*:
     - keep Email enabled, with **Confirm email** on
     - until the customer app uses accounts, turn **off** *Allow new users to sign up*
     - add staff from *Authentication → Users → Add user / Invite*
   - **URL Configuration:**
     - set the Site URL to `https://link-page.github.io/JACOBSBARBERSHOPNISYONI/admin/`
     - add `http://localhost:5173/JACOBSBARBERSHOPNISYONI/admin/` to the redirect URLs for local testing

   Invites and password-reset emails link to these addresses.

4. **Make the first owner.** After Jacob's account exists, run this in the SQL Editor (with his real email):
   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'JACOB_EMAIL');
   update public.barbers set user_id = (select id from auth.users where email = 'JACOB_EMAIL')
   where id = '11111111-1111-4111-8111-111111111111';
   ```
   Future barbers: invite them, then link them from *צוות → (barber) → גישה לניהול* in the admin.

5. **Schedule offer expiry.** Enable the `pg_cron` extension under *Database → Extensions*, then run:
   ```sql
   select cron.schedule('waitlist-maintenance', '*/5 * * * *', 'select public.run_waitlist_maintenance()');
   ```
   Check it with `select jobname, schedule from cron.job;`.

6. **Connect the website build.** In GitHub, go to *Settings → Secrets and variables → Actions → Variables* and add:
   - `VITE_SUPABASE_URL`: the Project URL
   - `VITE_SUPABASE_ANON_KEY`: the **publishable** key, despite the variable's name

   The deploy workflow validates both variables, then passes them to the build.

7. **Local development against Supabase:** copy `.env.example` to `.env.local` and fill in the same two values. `.env.local` is git-ignored. `npm run check:env` confirms the values without printing them.

## Development

```bash
npm run dev            # admin at http://localhost:5173/JACOBSBARBERSHOPNISYONI/admin/
npm run check:env      # validates .env.local without printing it
npm test               # unit tests
npm run test:db        # database tests: needs a disposable Postgres 16, see below
npm run test:stack     # integration tests: needs a local Supabase stack, see below
npm run test:hosted    # read-only checks against the project in VITE_SUPABASE_URL
npm run lint && npm run typecheck:tests && npm run build
```

**Without Supabase configured,** `npm run dev` runs the admin on a **development prototype**: in-memory sample data with a visible banner and an owner/barber role switch. It applies the same rules, resets on reload, and is never included in production builds. A production build without Supabase shows only a setup notice: no login and no data.

**With `.env.local` filled in,** `npm run dev` runs the real admin against that project. Anything you do there is real data.

## Verification

Four layers. Each one says plainly what it ran against.

| Layer | Runs against | Where it runs | Command |
| --- | --- | --- | --- |
| Unit | Scheduling rules, permissions, statistics, key policy, adapter result helpers | *CI* workflow, locally | `npm test` |
| Database | The migrations on plain **Postgres 16**, with a shim emulating `auth.uid()` and the API roles | *CI* workflow (Postgres service), locally | `npm run test:db` |
| Integration | A **real Supabase stack** (Auth, PostgREST, RLS, Storage) built from `supabase/migrations` and `seed.sql`, driven **through the admin's own Supabase adapter** as different signed-in users | *Supabase verification* workflow, job *local stack* | `npm run test:stack` |
| Hosted, read-only | **The hosted project** in the repository variables, as an anonymous visitor. Writes nothing | *Supabase verification* workflow, job *hosted* | `npm run test:hosted` |

**Integration** (`tests/stack/`) covers:
- **Access:**
  - anonymous visitors get only the catalogue
  - a customer account is "not staff" and every business write is refused
  - a barber sees and manages only their own chair
- **Appointments:**
  - the owner session resolves to the owner and Jacob's chair
  - create, double booking refused, reschedule, edit, history, cancel
  - completed and no-show outcomes
  - two simultaneous bookings for one slot: exactly one succeeds
  - blocking time, capacity, unblocking
- **Waiting list:** the full policy. Customers join a full day; a cancellation offers the slot to the oldest request and holds it; claiming books it; expiry passes it on; the outbox shows the queued (unsent) messages.
- **Catalogue:**
  - settings round trip
  - services create, assign and reorder
  - Jacob's schedule round trip
  - only the owner can upload media

Locally, `npm run test:stack` needs Docker and `npx supabase@2.122.0 start`, then the `STACK_*` variables from `npx supabase status -o env`. Without them, the suite skips.

**Hosted, read-only** (`tests/hosted/`) covers:
- the seeded catalogue and the current month's availability are served
- every private table is closed to anonymous callers
- all 13 staff and customer functions are installed and closed to anonymous callers
- a wrong password is rejected

The same job also:
- validates the variables without printing them
- proves the build compiled both in, with no secret key in any bundle and none of the Supabase settings in the customer bundle
- reports the project's Auth settings (`scripts/report-hosted-auth.ts`): public sign-up and email confirmation, as warnings

**Database tests:** locally, set `TEST_DATABASE_URL` to a superuser connection on a throwaway server; the default is `postgres://postgres@127.0.0.1:54329/postgres`. The tests drop and recreate a `jacobs_test` database.

### What automation does not cover

Signing in to the **hosted** project as the owner and changing data there. That would need the owner's password in GitHub, which this project doesn't store. The same code paths run on the local stack, but the hosted project's own Auth settings, owner link and data are checked only by hand.

### Manual owner test (hosted project)

This runs the real admin on your own computer against the hosted project. Everything you do here is **real data**.

#### 1. Run it

You need Git and **Node.js 22.18 or newer** (Node 24 LTS is fine).

1. **Get the development branch.**
   - **First time:**
     ```bash
     git clone https://github.com/Link-page/JACOBSBARBERSHOPNISYONI.git
     cd JACOBSBARBERSHOPNISYONI
     git checkout claude/charming-dijkstra-md9hbb
     ```
   - **Existing copy:**
     ```bash
     git fetch origin
     git checkout claude/charming-dijkstra-md9hbb
     git pull
     ```
2. **Create `.env.local`** in the project folder. It holds only the Project URL and the **publishable** key (Setup step 1). Never put a secret key in it. The file is git-ignored.
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_…
   ```
3. **Install dependencies and check the file.** The check refuses a secret key and never prints the values:
   ```bash
   npm ci
   npm run check:env
   ```
   Expect `✓ Supabase build variables are valid (URL format OK, key type: publishable).`
4. **Start the admin** with `npm run dev`, then open **http://localhost:5173/JACOBSBARBERSHOPNISYONI/admin/**. If Vite prints a different port, use that one.

#### 2. Confirm it is the real database, not the prototype

- **No prototype:** there is no gold "אב-טיפוס לפיתוח" banner. The first screen is **כניסת צוות**; the prototype never asks you to sign in.
- **Your Supabase data:** after signing in, *Team* shows Jacob, and *Services* shows the six seeded services (תספורת הבית … תספורת ילדים), plus anything you added.
- **Supabase dashboard:**
  - after signing in, *Authentication → Users* shows a new *Last signed in* time for the owner
  - after creating something, the row appears in *Table Editor* (`appointments`, `time_blocks`, `services`…)
  - the change appears in `audit_log`, with your user as the actor

#### 3. Sign in

Enter the owner's email and password and press **כניסה**. The dashboard should greet **שלום, יעקב**.

| You see | Meaning and fix |
| --- | --- |
| אימייל או סיסמה שגויים | Wrong email or password. If the password is unknown, ask before resetting it: a recovery email links to the Site URL (the admin isn't published yet), and the admin has no password-reset screen. |
| כתובת האימייל של החשבון עוד לא אומתה | The account's email isn't confirmed. Click the link in the confirmation email. Supabase confirms the address even though the page it then opens isn't published yet. Then sign in again. |
| אין גישה לניהול | Signed in, but the profile's role isn't `owner`. Repeat Setup step 4. |
| אין חיבור לשרת | The computer can't reach Supabase. Check the connection and the URL in `.env.local`, then restart `npm run dev`. |
| מערכת הניהול עוד לא חוברה / הגדרות השרת דורשות תיקון | `.env.local` is missing or wrong. Run `npm run check:env`, then restart `npm run dev`. |

#### 4. Test checklist

Use a free weekday afternoon **next week**, since Jacob works Sunday–Thursday 09:00–20:00. Name everything you create **בדיקה**. The customer app isn't connected yet, so no customer sees these changes, but they are stored for real.

**Appointments**
- [ ] *תור חדש* → *לקוח חדש*: create **בדיקה** with a test phone number → *שמירת לקוח*.
- [ ] Pick Jacob, a service and the date; choose a free time → *קביעת התור*. The toast says *התור נקבע*, and the appointment shows in the day and week calendar.
- [ ] **Double booking.** *תור חדש* again for the same customer, barber, service and date:
  - the booked time is no longer offered
  - typing it under *שעה אחרת* → *קביעת התור* shows *השעה כבר לא פנויה*
- [ ] **Reschedule.** Open the appointment → *שינוי מועד* → pick a new time → *אישור המועד*. *היסטוריית שינויים* lists the change.
- [ ] **Edit.** Change the notes → *שמירת שינויים*.
- [ ] **Cancel.** *ביטול* → *ביטול התור*. It shows struck through as cancelled, and its time is offered again.
- [ ] **Customer card.** *לקוחות*: search **בדיקה** and open it. The visits and cancelled appointment are listed. Add a staff note.

**Schedule management**
- [ ] **Block time.** *יומן* → *חסימה*: Jacob, 15:00–16:00, reason **בדיקה** → *חסימה*. The striped block appears, and *תור חדש* no longer offers 15:00 that day.
- [ ] **Remove the block.** Tap the block (or its label) → *הסרת החסימה* → *הסרת החסימה*. The time is offered again.
- [ ] **Closed day.** *הגדרות* → *ימים סגורים*: add a date next month with reason **בדיקה**. That day shows as closed in the month view. Remove it with the bin icon.
- [ ] **Working hours.** *צוות* → *יעקב* → *שעות עבודה*: change one day's closing time → *שמירה* (*הפרטים נשמרו*). New-appointment times follow it. **Change it back** and save.
- [ ] **Breaks.** In the same sheet, under *הפסקות קבועות*: *הוספת הפסקה* → save, then check the times. Remove it with its bin icon → save.

**Services**
- [ ] *טיפולים* → *טיפול חדש*: name **בדיקה**, 30 minutes, any price, *מבוצע על ידי* Jacob, *מוצג ללקוחות* **off** → *שמירה* (*הטיפול נשמר*).
- [ ] Edit it: change the price → *שמירה*. The list shows the new price.
- [ ] **Order.** Move it with its up arrow → *שמירת הסדר* (*הסדר נשמר*), then move it back down and save again.
- [ ] Leave it **off**: services can't be deleted, only hidden.

**Waiting list**

The admin manages waiting-list requests, but only customers can create them. The customer app isn't connected yet, so the list is empty. The full flow (join → offer → hold → claim → expiry) is tested on the local Supabase stack and in the database tests.
- [ ] *המתנה* loads without an error and shows *אין ממתינים*. The barber filter works.
- [ ] *בדיקת הצעות שפגו* shows *הצעות שפגו הועברו הלאה*.
- [ ] *הודעות ללקוחות* says no message provider is connected, so nothing is sent.

**Access**
- [ ] *יציאה* signs you out. Opening `/admin/` in a private window shows only the sign-in screen, and a wrong password shows *אימייל או סיסמה שגויים*.

#### 5. What stays in the database afterwards

The admin keeps a history, so some test records remain:
- the customer **בדיקה**
- the cancelled appointment
- the hidden service **בדיקה**
- their `audit_log` entries

Blocks, closed days and breaks you removed are gone, and hours you changed back are as before. None of this is visible to customers.

## Before publishing

**Must be done** before merging to `main`:

1. **Manual owner test** above, on the hosted project.
2. **Auth settings** (Setup step 3):
   - public sign-up off
   - email confirmation on
   - Site URL and redirect URLs set

   The *hosted* job in *Supabase verification* reports the first two on every run.
3. **Offer expiry schedule** (Setup step 5). Without it, an unclaimed waiting-list offer keeps its slot blocked until a staff member presses **בדיקת הצעות שפגו**.
4. **Merge to `main`** with the owner's approval. The deploy workflow refuses unsafe Supabase settings, then builds with the variables.
5. **After deployment,** open `/admin/` on the live site, sign in, and repeat check 1. The live site is confirmed only once this works.

**Known limitations** (not blockers for the admin, but decide on them):

- **The customer app is not connected to Supabase yet.** It still uses its on-device demo data, and bookings made there never reach the admin. Connecting it needs:
  - a short contact-details step (name and phone) with anonymous or phone sign-in
  - loading services and team from the database

  The database functions it needs already exist and are tested: `book_appointment`, `join_waitlist`, `claim_waitlist_offer`, `cancel_appointment`.
- **No SMS or WhatsApp provider is connected.** Offers are queued but not sent.
- **No MFA or password-reset screens in the admin.** Use the Supabase dashboard (*Authentication → Users*) meanwhile. The admin does not require MFA.
- **Barbers can't edit their own breaks yet.** The database allows it; the screen is owner-only for now.
- **Time zone:** the admin uses the device time zone, which is assumed to be the shop's (`Asia/Jerusalem`).
