# JACOB'S — Notifications and attendance confirmation

Push notifications, the in-app notification centre, attendance confirmation the day before, automatic cancellation, the waiting list ("everyone is told, the first to book wins"), the two-hour reminder, and messages from the shop.

**SMS is not used for any of this.** It stays reserved for phone sign-in codes (not built yet). No SMS or WhatsApp *provider* is involved: the WhatsApp button only opens a chat in the customer's own WhatsApp.

## Status

| Part | State |
| --- | --- |
| Database rules (migrations 0011–0016) | Written and tested: local Postgres (59 tests) and a local Supabase stack in CI. **Not installed on the hosted project yet.** |
| Customer app and admin screens | Built; tested in the browser against mocked Supabase (customer) and the in-memory prototype (admin) |
| Push dispatcher (Edge Function `push-dispatch`) | Written and tested in Node and, in CI, on Deno 2.5 (the Edge Functions' runtime). A real encrypted Web Push payload decrypts again, and the function type-checks. **Not deployed:** Supabase's hosted runtime itself is untested. |
| Real pushes reaching real phones | **Not verified.** Needs the setup below, then a test on each kind of device. |

Until the setup is done, everything except the push itself already works once the migrations are installed: requests, confirmations, cancellations and waiting-list messages land in each customer's in-app notification centre.

## What it does

### Attendance confirmation (day before)

- **The plan.** It is decided when an appointment is booked or moved, by the **database clock** in **Asia/Jerusalem**. *R* is the request time and *D* the deadline, both on the day before (defaults 10:00 and 20:00; the owner changes them in *הגדרות → אישור הגעה ותזכורות*):
  - **Booked more than an hour before D:** confirmation is needed. The request goes out at R, or right away if R has passed.
  - **Booked within the last hour before D, or after it (a late booking):** never auto-cancelled. By default the booking itself counts as confirmation (*ההזמנה עצמה נחשבת אישור הגעה*); the owner can instead exempt such bookings.
  - **Walk-ins booked by staff for a customer without an app account:** not required. They can't confirm in an app.
  - **Appointments that existed before migration 0012:** not required.
  - **Moving an appointment** re-plans it from the moment it moves.
- **Confirming.** The customer can confirm until D, in the app or from the notification. After D they get *המועד לאישור הגעה עבר*. Staff can confirm for them at any time, after a phone call (*אישור טלפוני* in the appointment sheet).
- **After confirmation:**
  - The app shows **הגעה אושרה** with the time it was confirmed.
  - Cancel and reschedule are replaced by **לשיחה בוואטסאפ**. It opens a WhatsApp chat with the barber (their own number if set, otherwise the shop's) with a prefilled Hebrew request. **Opening WhatsApp cancels nothing.** Staff cancel after reading the request. Without any WhatsApp number, the button calls the shop instead.
  - Only staff can cancel or move a confirmed appointment. The database enforces this with the trigger `appointments_a_guard_confirmed`, whatever path a request takes.

### Automatic cancellation

At D, an appointment that is still unconfirmed is cancelled, if *ביטול אוטומטי* is on (the default):
- The cancellation is atomic. The time is released, the reason is recorded (`no_confirmation`), the customer is told, and everyone waiting for that day is notified.
- It is idempotent: running it again changes nothing and notifies nobody twice.
- **Race with a confirmation.** The job locks each row and checks it again. A confirmation that is already in progress wins, and the job leaves that appointment alone. If the job got there first, the customer's confirmation waits for it, then is refused. A test reproduces both orders with two real database sessions.
- It never touches confirmed, completed or late-booked appointments.

### Waiting list: everyone is told, nothing is held

This replaces the earlier exclusive offers with holds.

- When booked time is freed (cancelled by anyone, moved, or auto-cancelled), **every** customer waiting for that day whose service fits the freed time is told. They get an inbox message and a push, with the date, time and a link that opens booking on that day.
- **No holds and no priority.** The first booking that commits gets the time. Everyone else gets **התור כבר נתפס. בחרו שעה אחרת.** The exclusion constraint on appointments makes a double booking impossible.
- **No duplicates.** There is one notification per freed time per customer: each event and each message has a unique key.
- Joining is unchanged: only for a day with no free slot, once per customer, service, day and barber choice.

### Reminder

There is one reminder, about two hours before the appointment (configurable from 30 to 360 minutes):
- **only for confirmed appointments**, and never twice
- not when the appointment was confirmed less than that long before it starts
- not when it would arrive within 15 minutes of the start

Customers can turn the reminder push off in their profile. The inbox still gets it.

### Messages from the shop (admin *התראות*)

- **Who can send:** the owner, or a barber the owner explicitly allows (*צוות → barber → רשאי לשלוח הודעות ללקוחות*). Nobody can grant themselves the permission.
- **Audiences:**
  - **opted_in:** customers who agreed to messages from the shop. This is consent; the switch is in their profile and **off by default**. Use this for anything promotional.
  - **upcoming:** customers with an appointment in the next 7 days. This is for service notices about their visit, such as a closure or a delay. A barber reaches only their own chair's customers.
- **Protections, enforced in the database:**
  - an idempotency key per draft, so a double click sends once
  - one send at a time per sender
  - 2 minutes between sends
  - at most 10 sends a day for the owner and 3 for a barber
  - no identical title and text within 24 hours
  - at most 5,000 recipients
  - in-app links only
- **History shows counts only:** recipients, *התקבלו* (accepted by the push service), *נכשלו* and *ממתינות*. Senders never see who received a message. "Accepted" is not proof that a phone displayed it, and the screen says so.

### Notification centre (customer app)

- Opens from the bell on the home screen, or the bell in the desktop navigation.
- Categories: confirmation needed, attendance confirmed, cancelled, reminder, waiting-list time available, message from the shop.
- Messages show read or unread, can be marked read, and open their link: the appointment, or booking on the freed day.
- It works with push denied or unsupported. It never promises that a push will arrive: *גם בלי התראות, אישור ההגעה נעשה כאן באפליקציה*.
- Old messages are cleaned up automatically: read ones after 90 days, any after a year.

### Push on devices

| Device | How |
| --- | --- |
| Android (Chrome, Edge, Samsung Internet), desktop Chrome, Edge, Firefox, Safari 16+ on macOS 13+ | *הפעלת התראות* in the notification centre → allow. |
| iPhone and iPad (iOS/iPadOS 16.4+) | Only from the Home Screen app. The app explains the steps: Share → *הוספה למסך הבית* → open JACOB'S from the icon → *הפעלת התראות*. |
| Denied, or an unsupported browser | The app says so and how to allow notifications. The in-app centre keeps working. |

- **One subscription per device**, at most 10 per account.
- **A device the push service no longer knows** (HTTP 404 or 410) is removed.
- **Signing in as someone else on the same browser** moves that device to the current account.

## Architecture

```
supabase/migrations/
  0011_notifications.sql        devices, preferences, inbox, push deliveries (status, attempts, retries), app.notify
  0012_attendance.sql           confirmation plan, guard trigger, confirm_attendance, cancellation reasons
  0013_waitlist_broadcast.sql   notify-everyone waiting list; retires offers and holds
  0014_broadcasts.sql           messages from the shop: permission, audiences, limits, history (counts only)
  0015_scheduler.sql            app.run_scheduler: requests, auto-cancel, reminders, expiry, clean-up
  0016_notification_table_grants.sql  default-deny table privileges for the new tables
supabase/functions/
  _shared/dispatch-core.ts      claim → send → record, retries and outcomes (pure; tested in Node)
  _shared/web-push-sender.ts    builds the encrypted Web Push request (VAPID, aes128gcm), TTL and urgency
  push-dispatch/index.ts        the Edge Function: checks the dispatch secret, runs the core
public/sw.js                    service worker: shows pushes (RTL, Hebrew), opens only in-app links
src/notifications/              customer side: contract, Supabase + demo implementations, push client,
                                support detection, VAPID key check, state hooks, provider, components/
src/features/confirmation/      attendance view, confirm hook, panel, WhatsApp link and button
src/lib/deep-link.ts            the only in-app link shapes notifications may carry
src/admin/features/notifications/   composer, preview, history, page
src/admin/features/appointments/attendance-info.tsx    status + by-phone confirm
src/admin/features/settings/confirmation-policy-panel.tsx
src/admin/features/barbers/broadcast-permission.tsx
```

**How a notification travels:**

1. A change in the database (a cancellation, a confirmation, a scheduled step) calls `app.notify`.
2. `app.notify` writes **one inbox message** (unique key) and **one pending delivery per device** (unless the customer turned that kind of push off).
3. **pg_cron, every minute:**
   - `run_waitlist_maintenance()` runs the scheduler (requests, auto-cancel, reminders, expiry, clean-up).
   - `net.http_post` wakes the `push-dispatch` Edge Function.
4. **The Edge Function** claims due deliveries (each is leased for 2 minutes, so it is never sent twice). It encrypts and sends each one with the VAPID keys, then records the outcome:

| Push service answer | Recorded as |
| --- | --- |
| 2xx | `sent` (accepted by the push service) |
| 404 or 410 | device removed; delivery `failed` |
| 429 or 5xx | retried after 1, 2, 4 and 8 minutes; `failed` after 5 attempts |
| anything else | `failed` |

**Push lifetimes (TTL):** waiting list 1 hour, reminder 2 hours, confirmation request 12 hours, others 24 hours. A push that can't be delivered in time is dropped by the push service rather than arriving out of date.

### Security

- **Keys:**
  - The browser holds only the **VAPID public key**, which is public by design.
  - The private key, the dispatch secret and the service-role key live only in the Edge Function's secrets and the database Vault.
  - The build refuses a VAPID private key pasted into the public variable, and the app ignores anything that isn't a public key.
- **The dispatcher endpoint** rejects any request without the dispatch secret (compared in constant time). `push_claim` and `push_finish` can only be called by the service role.
- **Every write goes through checked database functions.** Customers can read only their own devices, preferences and inbox. Signed-out callers have no table privileges on any of the new tables (0016).
- **Notification links** are limited to `?go=notifications`, `?go=appointment&id=<uuid>` and `?go=book&service=…&barber=…&date=…`. The service worker opens only addresses inside the app.
- **Pushes carry no more than the inbox message:** title, text, link and category.

## Migration plan

These migrations are **forward-only**: none of 0001–0010 is changed. Run them **in order**, in the SQL Editor, **before** publishing this version. The app reads the new columns.

| Migration | Changes to existing data |
| --- | --- |
| 0011 | None (new tables and functions). |
| 0012 | Adds columns. Existing appointments become `not_required`, so nobody is asked to confirm, or auto-cancelled, for an appointment booked before this. |
| 0013 | **Changes rows:** any waiting-list entry with an open offer (`status = 'offered'`) goes back to `waiting`, and its held time is released for anyone to book. Check first, read-only: `select count(*) from public.waitlist_entries where status = 'offered';` |
| 0014 | None (adds a column defaulting to `false`, and a table). |
| 0015 | None. Replaces `run_waitlist_maintenance()`, so your existing cron job now runs the scheduler. |
| 0016 | None (privileges only). |

## External setup (owner, step by step)

Nothing below has been done to the hosted project. Each step is yours to run.

> **Never** paste the VAPID private key, the dispatch secret or a service-role key into the website, a GitHub *variable*, a committed file, or a chat.

1. **Back up.** If your plan offers backups, check the latest one under *Database → Backups*.
2. **Install the migrations.** In *SQL Editor*, run the contents of each file in order: `0011_notifications.sql`, `0012_attendance.sql`, `0013_waitlist_broadcast.sql`, `0014_broadcasts.sql`, `0015_scheduler.sql`, `0016_notification_table_grants.sql`. Run the 0013 check above first.
3. **Check they're installed** (read-only). Every column should be `true`:
   ```sql
   select
     to_regclass('public.inbox_messages') is not null                                  as m0011,
     exists (select 1 from information_schema.columns
             where table_name = 'appointments' and column_name = 'confirmation_status') as m0012,
     exists (select 1 from pg_proc where proname = 'announce_freed_time')              as m0013,
     to_regclass('public.broadcasts') is not null                                      as m0014,
     exists (select 1 from pg_proc where proname = 'run_scheduler')                    as m0015,
     not has_table_privilege('anon', 'public.inbox_messages', 'select')                as m0016;
   ```
4. **Run the scheduler every minute.** Re-scheduling the existing job by its name updates it:
   ```sql
   select cron.schedule('waitlist-maintenance', '* * * * *', 'select public.run_waitlist_maintenance()');
   ```
   At this point confirmations, auto-cancel, reminders and waiting-list messages already work in the in-app centre. Only the pushes are missing.
5. **Create the VAPID keys.** On your own computer: `npx web-push generate-vapid-keys`. Keep both keys in a password manager.
6. **Public key → website.** In GitHub, go to *Settings → Secrets and variables → Actions → **Variables*** and add `VITE_VAPID_PUBLIC_KEY` = the **public** key.
7. **Dispatch secret.** Generate a long random value, for example with `openssl rand -hex 32`. Keep it in the password manager too.
8. **Deploy the Edge Function** from a checkout of this branch, on your computer:
   ```bash
   npx supabase@2.122.0 login
   ```
   ```bash
   npx supabase@2.122.0 functions deploy push-dispatch --project-ref weqjmyvksipabrhdwhgv --no-verify-jwt
   ```
   `--no-verify-jwt` is intended. The function checks its own dispatch secret instead, and pg_cron has no user token to send.
9. **Set the function's secrets.** Put them in a file **outside the repository**, for example `~/push-secrets.env`:
   ```
   VAPID_PUBLIC_KEY=<public key>
   VAPID_PRIVATE_KEY=<private key>
   VAPID_SUBJECT=mailto:<an address you read>
   PUSH_DISPATCH_SECRET=<the value from step 7>
   APP_URL=https://link-page.github.io/JACOBSBARBERSHOPNISYONI/
   ```
   Then run:
   ```bash
   npx supabase@2.122.0 secrets set --env-file ~/push-secrets.env --project-ref weqjmyvksipabrhdwhgv
   ```
   Then delete the file. `SUPABASE_URL` and the service-role key are provided to the function by Supabase; don't set them.
10. **Let the database call the function.**
    1. Enable **pg_net** under *Database → Extensions*.
    2. In *SQL Editor*, store the address and the secret in Vault. Type the secret yourself; it stays encrypted in your project:
       ```sql
       select vault.create_secret('https://weqjmyvksipabrhdwhgv.supabase.co/functions/v1/push-dispatch', 'push_dispatch_url');
       select vault.create_secret('<the value from step 7>', 'push_dispatch_secret');
       ```
    3. Schedule the call:
       ```sql
       select cron.schedule('push-dispatch', '* * * * *', $$
         select net.http_post(
           url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'x-dispatch-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')),
           body := '{}'::jsonb,
           timeout_milliseconds := 30000)
       $$);
       ```
11. **Check the jobs** (read-only), after a few minutes:
    ```sql
    select jobname, schedule, active from cron.job order by jobname;

    select j.jobname, d.status, d.return_message, d.start_time
    from cron.job_run_details d join cron.job j using (jobid)
    order by d.start_time desc limit 10;

    -- The function's answers: 200 with {"claimed":…,"sent":…} is healthy; 403 = the secrets differ; 500 = VAPID keys missing.
    select status_code, left(content::text, 200) as content, created
    from net._http_response order by created desc limit 5;

    select status, count(*) from public.push_deliveries group by status;
    ```
12. **Contact numbers.** In the admin, *הגדרות → וואטסאפ* is the shop's WhatsApp, in international digits (972…). Optionally set each barber's own number in *צוות*.
13. **Publish** (merge to `main`, with your approval) only after steps 2–3. The deploy builds with `VITE_VAPID_PUBLIC_KEY`.
14. **Test on real devices**, with a *customer* account (staff accounts don't receive customer messages):
    - Android Chrome and a desktop browser: *הפעלת התראות* → allow.
    - iPhone: add to the Home Screen, open from the icon → *הפעלת התראות*.
    - In that account's profile, turn on *הודעות ועדכונים מהמספרה*. Then from the admin, send a message to *opted_in*. The phone should show it within about a minute, and the history should count it as *התקבלו*.
    - Book an appointment and cancel it from the admin. The customer should get *התור בוטל*.

## Tests

| Layer | Where | Covers |
| --- | --- | --- |
| Database rules | `supabase/tests/` (local Postgres, with Supabase's default privileges emulated) | confirmation plan and late bookings; locked cancellation; deadline refusal; staff confirm; requests once; auto-cancel once, only unconfirmed, freeing the time and notifying the waiting list; the confirm-versus-auto-cancel race in two real sessions; reminders (confirmed only, once, never stale); everyone-notified waiting list with no holds; retired offers; devices, inbox privacy, preferences; dispatch claim/lease/retry/back-off/expired device; broadcasts (consent, idempotency, pace, duplicates, links, unauthorised callers, a barber's own customers only, counts-only history); anonymous access to every new table |
| Real Supabase stack | `tests/stack/` (CI) | the same paths through the real customer-app and admin modules: confirm → locked cancel/move → staff cancel → customer told; staff confirm; devices and preferences private per account; owner broadcast once with counts; customers, signed-out callers and unauthorised barbers refused; the waiting-list race (exactly one booking wins) |
| Dispatcher | `supabase/functions/_shared/*.test.ts` (Node) and `push-dispatch/runtime_test.ts` (Deno, CI) | outcome mapping, payload, links, retries, concurrency; on both runtimes, a real VAPID-signed aes128gcm payload decrypted again; the function type-checks on Deno |
| Customer app | unit tests + browser QA (mocked Supabase) | enable push, denied, unsupported, iPhone guidance; centre, read state, deep links; confirm → *הגעה אושרה* → WhatsApp (no cancel request sent); late confirm refused; preferences; RTL; 375 px, 390 px and desktop without overflow |
| Admin | unit tests + browser QA (prototype) | compose → preview → confirm → send → history; second send refused; settings validation; by-phone confirm; waiting-list wording; barber WhatsApp and permission; a barber without permission doesn't see the section; scrolling at 375/390/430 px and desktop |
| Hosted, read-only | `tests/hosted/` (CI) | which of 0011, 0012, 0014 and 0016 are missing; new functions and tables closed to signed-out callers |

**Not covered by automation:** delivery through Apple, Google and Mozilla push services to real devices, and the deployed Edge Function. Check these with step 14.
