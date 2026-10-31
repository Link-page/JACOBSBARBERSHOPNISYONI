-- JACOB'S — core schema.
-- Tables, enums and integrity constraints. Authorization lives in 0006_rls.sql;
-- every write that touches the schedule goes through the functions in 0004/0005.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- Private helpers (not exposed through the Supabase API, which serves `public`).
create schema if not exists app;

create type public.app_role as enum ('owner', 'barber', 'customer');
create type public.appointment_status as enum ('booked', 'completed', 'cancelled', 'no_show');
create type public.waitlist_status as enum ('waiting', 'offered', 'booked', 'removed', 'expired');
create type public.notification_channel as enum ('sms', 'whatsapp', 'email');
create type public.notification_status as enum ('pending', 'sent', 'failed');

-- One row per signed-in user (customers and staff). Role changes only through admin_set_user_role.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Single-row business configuration.
create table public.business_settings (
  id boolean primary key default true check (id),
  name text not null default 'JACOB''S',
  descriptor text not null default 'מספרה',
  logo_path text,
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  timezone text not null default 'Asia/Jerusalem',
  slot_step_minutes int not null default 30 check (slot_step_minutes between 5 and 120),
  lead_time_minutes int not null default 30 check (lead_time_minutes between 0 and 1440),
  booking_window_days int not null default 60 check (booking_window_days between 1 and 365),
  cancellation_notice_hours int not null default 3 check (cancellation_notice_hours between 0 and 168),
  waitlist_offer_minutes int not null default 120 check (waitlist_offer_minutes between 5 and 1440),
  booking_policy text not null default '',
  cancellation_policy text not null default '',
  appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  -- The staff account that signs in as this barber (optional until invited).
  user_id uuid unique references public.profiles (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  bio text not null default '',
  photo_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  duration_minutes int not null check (duration_minutes between 5 and 480),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  -- Display order in the customer app.
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Which barber offers which service, with an optional barber-specific duration.
create table public.barber_services (
  barber_id uuid not null references public.barbers (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  duration_minutes int check (duration_minutes between 5 and 480),
  primary key (barber_id, service_id)
);

-- Weekly hours. A weekday without a row is a day off. 0 = Sunday.
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (barber_id, weekday)
);

-- Recurring weekly breaks inside working hours.
create table public.breaks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- One-off unavailability: a barber's blocked hours or vacation, or (barber_id null)
-- the whole shop closed — holidays and closed dates.
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_blocks_range_idx on public.time_blocks using gist (barber_id, tstzrange(starts_at, ends_at));

-- People who book. A customer may exist without an account (phone or walk-in bookings by staff).
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
-- Not unique: matching a phone number must never hand one person's history to another.
create index customers_phone_idx on public.customers (phone);
create index customers_name_idx on public.customers (lower(full_name));

-- Staff-only notes about a customer.
create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  barber_id uuid not null references public.barbers (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Price at booking time; later price changes don't rewrite history.
  price numeric(10, 2) not null check (price >= 0),
  status public.appointment_status not null default 'booked',
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- The last line of defence against double booking: no two active appointments
  -- of the same barber may overlap, whatever path wrote them.
  constraint appointments_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('booked', 'completed'))
);
create index appointments_customer_idx on public.appointments (customer_id, starts_at);
create index appointments_starts_idx on public.appointments (starts_at);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  -- null = any barber
  barber_id uuid references public.barbers (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  wanted_date date not null,
  status public.waitlist_status not null default 'waiting',
  -- An open offer holds this slot for the customer until offer_expires_at.
  offered_starts_at timestamptz,
  offered_barber_id uuid references public.barbers (id) on delete set null,
  offer_expires_at timestamptz,
  appointment_id uuid references public.appointments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'offered' or (offered_starts_at is not null and offered_barber_id is not null and offer_expires_at is not null))
);
-- One active request per customer, service, day and barber choice.
create unique index waitlist_one_active_request on public.waitlist_entries (
  customer_id, service_id, wanted_date, coalesce(barber_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where status in ('waiting', 'offered');
create index waitlist_date_idx on public.waitlist_entries (wanted_date, status);

-- Outbox for customer messages. Rows stay 'pending' until a delivery provider
-- (SMS / WhatsApp / email) is connected and marks them sent.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  waitlist_entry_id uuid references public.waitlist_entries (id) on delete cascade,
  channel public.notification_channel not null default 'sms',
  status public.notification_status not null default 'pending',
  message text not null,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  barber_id uuid references public.barbers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  image_path text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log (entity, entity_id, created_at);
