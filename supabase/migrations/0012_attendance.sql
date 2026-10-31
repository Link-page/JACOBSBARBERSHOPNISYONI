-- ════════════════════════════════════════════════════════════════════════════
-- 0012 · Attendance confirmation
--
-- Booking an appointment and confirming attendance are separate. The plan for
-- each appointment is decided by app.confirmation_plan (pure; rules below) when
-- it is booked or moved, using the database clock and the shop's time zone.
--
-- Rules (R = request time, D = deadline, both on the day before the appointment):
--   • Customer without an app account (walk-in booked by staff): not required.
--   • Booked more than 1 hour before D: pending. The request goes out at R
--     (immediately if R has passed); unconfirmed at D → auto-cancelled (if enabled).
--   • Booked within 1 hour of D, or after D (a "late booking"): never auto-cancelled.
--     late_booking_policy = 'auto_confirm' (default): the booking itself counts
--     as confirmation. 'exempt': confirmation is not required.
--   • Moving an appointment re-plans it from the moment it is moved.
--   • Appointments that existed before this migration are 'not_required'.
--
-- After confirmation a customer can no longer cancel or move the appointment
-- (enforced here by trigger, whatever path is used); staff still can.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.business_settings
  add column confirmation_request_time time not null default '10:00',
  add column confirmation_deadline_time time not null default '20:00',
  add column auto_cancel_unconfirmed boolean not null default true,
  add column late_booking_policy text not null default 'auto_confirm' check (late_booking_policy in ('auto_confirm', 'exempt')),
  add column reminder_minutes_before int not null default 120 check (reminder_minutes_before between 30 and 360),
  add constraint confirmation_window_order check (confirmation_request_time < confirmation_deadline_time);

-- A barber's own WhatsApp number (digits, international format); empty = the shop's number.
alter table public.barbers add column whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,15}$');

create type public.confirmation_status as enum ('pending', 'confirmed', 'not_required');

alter table public.appointments
  add column confirmation_status public.confirmation_status not null default 'not_required',
  add column confirmation_request_at timestamptz,
  add column confirmation_requested_at timestamptz,
  add column confirmation_deadline timestamptz,
  add column confirmed_at timestamptz,
  add column confirmed_by text check (confirmed_by in ('customer', 'staff', 'booking')),
  add column cancellation_reason text check (cancellation_reason in ('customer', 'staff', 'no_confirmation', 'system')),
  add column cancelled_at timestamptz,
  add column reminder_sent_at timestamptz;

create index appointments_confirmation_due_idx on public.appointments (confirmation_deadline)
  where status = 'booked' and confirmation_status = 'pending';

/** The confirmation plan for an appointment at p_starts_at, decided at p_now (rules in the header). */
create function app.confirmation_plan(
  p_starts_at timestamptz,
  p_now timestamptz,
  p_has_account boolean,
  p_settings public.business_settings,
  out status public.confirmation_status,
  out request_at timestamptz,
  out deadline timestamptz
)
language plpgsql stable as $$
declare
  v_day_before date := (p_starts_at at time zone p_settings.timezone)::date - 1;
  v_request timestamptz := (v_day_before + p_settings.confirmation_request_time) at time zone p_settings.timezone;
  v_deadline timestamptz := (v_day_before + p_settings.confirmation_deadline_time) at time zone p_settings.timezone;
begin
  if not p_has_account then
    status := 'not_required';
  elsif p_now < v_deadline - interval '1 hour' then
    status := 'pending';
    request_at := greatest(v_request, p_now);
    deadline := v_deadline;
  elsif p_settings.late_booking_policy = 'auto_confirm' then
    status := 'confirmed';
  else
    status := 'not_required';
  end if;
end $$;

/** "יום שלישי 4.11 בשעה 17:30" in the shop's time zone. */
create function app.appointment_when(p_at timestamptz) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select format('יום %s %s בשעה %s',
    (array['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'])[extract(dow from l) + 1],
    to_char(l, 'FMDD.FMMM'), to_char(l, 'HH24:MI'))
  from (select p_at at time zone (app.settings()).timezone as l) t
$$;

/** "תספורת הבית אצל יעקב" */
create function app.appointment_what(p_appointment public.appointments) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select format('%s אצל %s', s.name, b.name)
  from public.services s, public.barbers b
  where s.id = p_appointment.service_id and b.id = p_appointment.barber_id
$$;

create function app.appointment_profile(p_appointment public.appointments) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select profile_id from public.customers where id = p_appointment.customer_id
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────

/** 1st: a confirmed appointment can't be cancelled or moved by the customer (staff still can). */
create function app.guard_confirmed_appointment() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.status = 'booked' and old.confirmation_status = 'confirmed'
     and (new.status = 'cancelled' or new.starts_at <> old.starts_at or new.barber_id <> old.barber_id)
     and auth.uid() is not null and not app.can_manage_barber(old.barber_id) then
    raise exception 'confirmed_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger appointments_a_guard_confirmed
  before update on public.appointments
  for each row execute function app.guard_confirmed_appointment();

/** 2nd: plan confirmation when booked or moved; record who cancelled and when. */
create function app.plan_appointment_confirmation() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_plan record;
begin
  if new.status = 'booked' and (tg_op = 'INSERT' or new.starts_at <> old.starts_at) then
    v_plan := app.confirmation_plan(
      new.starts_at, now(),
      exists (select 1 from public.customers c where c.id = new.customer_id and c.profile_id is not null),
      app.settings());
    new.confirmation_status := v_plan.status;
    new.confirmation_request_at := v_plan.request_at;
    new.confirmation_deadline := v_plan.deadline;
    new.confirmation_requested_at := null;
    new.reminder_sent_at := null;
    new.confirmed_at := case when v_plan.status = 'confirmed' then now() end;
    new.confirmed_by := case when v_plan.status = 'confirmed' then 'booking' end;
  end if;
  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.cancellation_reason := coalesce(new.cancellation_reason,
      case when auth.uid() is null then 'system' when app.is_staff() then 'staff' else 'customer' end);
  end if;
  return new;
end $$;

create trigger appointments_b_plan_confirmation
  before insert or update on public.appointments
  for each row execute function app.plan_appointment_confirmation();

/** Tells the customer when the shop confirms for them or cancels their appointment. */
create function app.notify_appointment_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_profile uuid := app.appointment_profile(new);
  v_link text := '?go=appointment&id=' || new.id;
begin
  if new.confirmation_status = 'confirmed' and old.confirmation_status <> 'confirmed' and new.confirmed_by in ('customer', 'staff') then
    perform app.notify(v_profile, 'appointment_confirmed', 'הגעה אושרה',
      format('%s · %s', app.appointment_when(new.starts_at), app.appointment_what(new)), v_link,
      format('confirmed:%s:%s', new.id, extract(epoch from new.starts_at)::bigint), new.id,
      -- The customer just confirmed in the app: an inbox entry is enough. Staff confirming for them: push too.
      p_push => new.confirmed_by = 'staff');
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' and new.cancellation_reason <> 'customer' then
    perform app.notify(v_profile, 'appointment_cancelled', 'התור בוטל',
      case new.cancellation_reason
        when 'no_confirmation' then format('התור %s בוטל כי ההגעה לא אושרה עד המועד שנקבע.', app.appointment_when(new.starts_at))
        else format('התור %s בוטל על ידי המספרה.', app.appointment_when(new.starts_at))
      end,
      v_link, format('cancelled:%s', new.id), new.id);
  end if;
  return null;
end $$;

create trigger appointments_notify_change
  after update on public.appointments
  for each row execute function app.notify_appointment_change();

-- ── Confirming ──────────────────────────────────────────────────────────────

/**
 * Confirms attendance. The customer: before the deadline only (by the database
 * clock — a confirmation committed first wins against the auto-cancel job, which
 * re-checks the row under lock). Staff (e.g. after a phone call): any time before
 * the appointment while it is still booked. Repeating it is harmless.
 */
create function public.confirm_attendance(p_id uuid) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.appointments;
  v_actor text;
begin
  select * into v_row from public.appointments where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_actor := app.appointment_actor(v_row);
  if v_actor is null then
    perform app.forbid();
  end if;
  if v_row.status <> 'booked' or v_row.starts_at <= now() then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if v_row.confirmation_status = 'confirmed' then
    return v_row;
  end if;
  if v_actor = 'customer' and v_row.confirmation_deadline is not null and now() >= v_row.confirmation_deadline then
    raise exception 'confirmation_closed' using errcode = 'P0001';
  end if;
  update public.appointments
  set confirmation_status = 'confirmed', confirmed_at = now(), confirmed_by = v_actor, updated_at = now()
  where id = p_id
  returning * into v_row;
  return v_row;
end $$;

revoke all on function
  app.confirmation_plan(timestamptz, timestamptz, boolean, public.business_settings),
  app.appointment_when(timestamptz),
  app.appointment_what(public.appointments),
  app.appointment_profile(public.appointments),
  app.guard_confirmed_appointment(),
  app.plan_appointment_confirmation(),
  app.notify_appointment_change()
from public, anon, authenticated;
revoke all on function public.confirm_attendance(uuid) from public, anon;
grant execute on function public.confirm_attendance(uuid) to authenticated;
