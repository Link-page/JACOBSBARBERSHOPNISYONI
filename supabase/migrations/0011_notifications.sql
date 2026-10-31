-- ════════════════════════════════════════════════════════════════════════════
-- 0011 · Notifications core
--
--   push_subscriptions       one row per device (browser push endpoint) per account
--   notification_preferences reminder pushes (default on) and shop messages (opt-in)
--   notification_events      de-duplication of things that happen once (a freed slot,
--                            a reminder…): the same event never notifies twice
--   inbox_messages           the in-app notification centre (works without push)
--   push_deliveries          the push outbox: one row per message per device, with
--                            attempts, back-off, status and the push service's answer
--
-- Messages are written here by database functions only. The push-dispatch Edge
-- Function (service role) claims due deliveries, sends them with the VAPID private
-- key — which never leaves the server — and records each outcome.
-- ════════════════════════════════════════════════════════════════════════════

create type public.notification_category as enum (
  'confirmation_required', 'appointment_confirmed', 'appointment_cancelled',
  'appointment_reminder', 'waitlist_available', 'shop_message'
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 40 and 200),
  auth text not null check (length(auth) between 10 and 100),
  user_agent text not null default '' check (length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  -- Push for the 2-hour reminder (the inbox always gets it).
  reminders boolean not null default true,
  -- Messages from the shop that aren't about the customer's own appointment: explicit consent only.
  shop_messages boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 500),
  -- In-app link (relative, e.g. '?go=appointment&id=…'); never an external URL.
  url text check (url is null or url ~ '^\?'),
  appointment_id uuid references public.appointments (id) on delete set null,
  event_id uuid references public.notification_events (id) on delete set null,
  broadcast_id uuid,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index inbox_messages_profile_idx on public.inbox_messages (profile_id, created_at desc);

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.inbox_messages (id) on delete cascade,
  -- Kept (as null) when the device unsubscribes, so failures stay countable.
  subscription_id uuid references public.push_subscriptions (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_http_status int,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (message_id, subscription_id)
);
create index push_deliveries_due_idx on public.push_deliveries (status, next_attempt_at);

/** Whether a message of this category may also be pushed to the person's devices. */
create function app.push_allowed(p_profile uuid, p_category public.notification_category) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case p_category
    when 'appointment_reminder' then coalesce((select reminders from public.notification_preferences where profile_id = p_profile), true)
    else true
  end
$$;

/**
 * Writes an inbox message — once per dedupe key — and queues a push to each of the
 * person's devices when allowed. Returns the message id, or null for a duplicate.
 * Callers decide consent for shop messages before calling (see 0014).
 */
create function app.notify(
  p_profile uuid,
  p_category public.notification_category,
  p_title text,
  p_body text,
  p_url text,
  p_dedupe text,
  p_appointment uuid default null,
  p_event uuid default null,
  p_push boolean default true,
  p_broadcast uuid default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if p_profile is null then
    return null;
  end if;
  insert into public.inbox_messages (profile_id, category, title, body, url, appointment_id, event_id, broadcast_id, dedupe_key)
  values (p_profile, p_category, p_title, p_body, p_url, p_appointment, p_event, p_broadcast, p_dedupe)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is not null and p_push and app.push_allowed(p_profile, p_category) then
    insert into public.push_deliveries (message_id, subscription_id)
    select v_id, s.id from public.push_subscriptions s where s.profile_id = p_profile;
  end if;
  return v_id;
end $$;

/** Records an event once; returns its id, or null when it already happened. */
create function app.record_event(p_kind text, p_dedupe text, p_payload jsonb default '{}'::jsonb) returns uuid
language sql security definer set search_path = public, pg_temp as $$
  insert into public.notification_events (kind, dedupe_key, payload)
  values (p_kind, p_dedupe, p_payload)
  on conflict (dedupe_key) do nothing
  returning id
$$;

-- ── Customer-facing functions ───────────────────────────────────────────────

/** Saves this device's push subscription for the signed-in account (moves it if another account had it). */
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default '')
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_seen_at = now();
  -- At most 10 devices per account: the oldest are forgotten.
  delete from public.push_subscriptions
  where profile_id = v_uid
    and id not in (select id from public.push_subscriptions where profile_id = v_uid order by last_seen_at desc limit 10);
end $$;

create function public.delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and profile_id = auth.uid()
$$;

/** Marks the given messages (or all, when null) as read. Returns how many changed. */
create function public.mark_inbox_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_count int;
begin
  update public.inbox_messages
  set read_at = now()
  where profile_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.set_notification_preferences(p_reminders boolean, p_shop_messages boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.notification_preferences (profile_id, reminders, shop_messages)
  values (auth.uid(), p_reminders, p_shop_messages)
  on conflict (profile_id) do update
    set reminders = excluded.reminders, shop_messages = excluded.shop_messages, updated_at = now();
end $$;

-- ── Dispatcher functions (service role only: the push-dispatch Edge Function) ──

/**
 * Claims up to p_limit due deliveries (skipping rows another dispatcher holds) and
 * leases them for two minutes. A crashed dispatcher's lease simply runs out.
 */
create function public.push_claim(p_limit int default 100)
returns table (delivery_id uuid, endpoint text, p256dh text, auth text, title text, body text, url text, category text, message_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  with due as (
    select d.id from public.push_deliveries d
    where d.subscription_id is not null
      and ((d.status = 'pending' and d.next_attempt_at <= now())
        or (d.status = 'sending' and d.locked_until < now()))
    order by d.next_attempt_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  ), claimed as (
    update public.push_deliveries d
    set status = 'sending', locked_until = now() + interval '2 minutes', attempts = d.attempts + 1
    from due where d.id = due.id
    returning d.*
  )
  select c.id, s.endpoint, s.p256dh, s.auth, m.title, m.body, m.url, m.category::text, m.id
  from claimed c
  join public.push_subscriptions s on s.id = c.subscription_id
  join public.inbox_messages m on m.id = c.message_id;
end $$;

/**
 * Records a delivery attempt. Outcomes:
 *   sent   — the push service accepted it (not proof the device displayed it)
 *   retry  — temporary failure: back off 1, 2, 4, 8 minutes; failed after 5 attempts
 *   gone   — the subscription expired (404/410): failed, and the device is forgotten
 *   failed — permanent failure
 */
create function public.push_finish(p_delivery uuid, p_outcome text, p_http_status int default null, p_error text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.push_deliveries;
begin
  select * into v_row from public.push_deliveries where id = p_delivery for update;
  if not found or v_row.status <> 'sending' then
    return; -- already finished (idempotent)
  end if;
  if p_outcome = 'sent' then
    update public.push_deliveries
    set status = 'sent', sent_at = now(), locked_until = null, last_http_status = p_http_status, last_error = null
    where id = p_delivery;
  elsif p_outcome = 'retry' and v_row.attempts < 5 then
    update public.push_deliveries
    set status = 'pending', locked_until = null, last_http_status = p_http_status, last_error = left(p_error, 300),
        next_attempt_at = now() + make_interval(mins => power(2, v_row.attempts - 1)::int)
    where id = p_delivery;
  else
    update public.push_deliveries
    set status = 'failed', locked_until = null, last_http_status = p_http_status,
        last_error = left(coalesce(p_error, case p_outcome when 'gone' then 'subscription_gone' when 'retry' then 'too_many_attempts' else 'failed' end), 300)
    where id = p_delivery;
    if p_outcome = 'gone' then
      delete from public.push_subscriptions where id = v_row.subscription_id;
    end if;
  end if;
end $$;

-- ── Access ──────────────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.push_deliveries enable row level security;

grant select on public.push_subscriptions, public.notification_preferences, public.inbox_messages to authenticated;
create policy push_subscriptions_own on public.push_subscriptions for select to authenticated using (profile_id = auth.uid());
create policy notification_preferences_own on public.notification_preferences for select to authenticated using (profile_id = auth.uid());
create policy inbox_messages_own on public.inbox_messages for select to authenticated using (profile_id = auth.uid());

revoke all on function
  app.push_allowed(uuid, public.notification_category),
  app.notify(uuid, public.notification_category, text, text, text, text, uuid, uuid, boolean, uuid),
  app.record_event(text, text, jsonb)
from public, anon, authenticated;

revoke all on function
  public.save_push_subscription(text, text, text, text),
  public.delete_push_subscription(text),
  public.mark_inbox_read(uuid[]),
  public.set_notification_preferences(boolean, boolean),
  public.push_claim(int),
  public.push_finish(uuid, text, int, text)
from public, anon;
grant execute on function
  public.save_push_subscription(text, text, text, text),
  public.delete_push_subscription(text),
  public.mark_inbox_read(uuid[]),
  public.set_notification_preferences(boolean, boolean)
to authenticated;
revoke all on function public.push_claim(int), public.push_finish(uuid, text, int, text) from authenticated;
grant execute on function public.push_claim(int), public.push_finish(uuid, text, int, text) to service_role;
