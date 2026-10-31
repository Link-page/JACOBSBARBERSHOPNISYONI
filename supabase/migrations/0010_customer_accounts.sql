-- ════════════════════════════════════════════════════════════════════════════
-- 0010 · Customer accounts
--
-- What public self-registration needs on top of 0001–0009:
--   • Israeli mobile numbers are validated and stored in one canonical form
--     (05XXXXXXXX, the same digits staff already type).
--   • register_customer() lets a signed-in account create or update ITS OWN
--     customer record. It never touches roles: profiles.role keeps its
--     'customer' default (handle_new_user ignores sign-up metadata).
--   • Per-customer caps on upcoming appointments and waiting-list requests,
--     so one account cannot fill the diary. Staff are not limited.
--
-- A phone number is NOT proof of identity (only the email is verified), so an
-- account is never linked to a customer record that staff created for that
-- phone: that would hand one person's history to whoever typed their number.
-- ════════════════════════════════════════════════════════════════════════════

/** Israeli mobile number → '05XXXXXXXX', or null when it isn't one. Accepts spaces, dashes, +972 / 972. */
create function app.normalize_il_mobile(p_phone text) returns text
language sql immutable set search_path = pg_catalog, pg_temp as $$
  select case when v ~ '^05[0-9]{8}$' then v end
  from (
    select regexp_replace(
             regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'),
             '^(\+?972)', '0'
           ) as v
  ) digits
$$;

/** Limits for self-service (tune here; staff bookings are never limited). */
create function app.customer_limits(out max_upcoming int, out max_waiting int)
language sql immutable as $$
  select 3, 3
$$;

/**
 * Creates or updates the signed-in account's own customer record and profile
 * name/phone. Returns the record. Errors: not_authenticated, invalid_name,
 * invalid_phone, phone_in_use (another account already uses the number).
 */
create function public.register_customer(p_full_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_phone text := app.normalize_il_mobile(p_phone);
  v_customer public.customers;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_phone is null then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  -- Serialise registrations of the same number so two accounts can't both claim it.
  perform pg_advisory_xact_lock(hashtextextended('customer-phone:' || v_phone, 0));
  if exists (
    select 1 from public.customers c
    where c.phone = v_phone and c.profile_id is not null and c.profile_id <> v_uid
  ) then
    raise exception 'phone_in_use' using errcode = 'P0001';
  end if;

  insert into public.customers (profile_id, full_name, phone, created_by)
  values (v_uid, v_name, v_phone, v_uid)
  on conflict (profile_id) do update set full_name = excluded.full_name, phone = excluded.phone
  returning * into v_customer;

  -- Name and phone only; the role column is deliberately not touched.
  update public.profiles set full_name = v_name, phone = v_phone where id = v_uid;

  return jsonb_build_object('id', v_customer.id, 'full_name', v_customer.full_name, 'phone', v_customer.phone);
end $$;

/** A customer booking for themselves may hold at most max_upcoming future appointments. */
create function app.enforce_customer_booking_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'booked' and not app.is_staff() and new.customer_id = app.current_customer_id() then
    -- Same lock as the waiting-list guard: two simultaneous bookings can't both pass the count.
    perform pg_advisory_xact_lock(hashtextextended('customer-limit:' || new.customer_id::text, 0));
    if (
      select count(*) from public.appointments a
      where a.customer_id = new.customer_id and a.status = 'booked' and a.starts_at > now()
    ) >= (app.customer_limits()).max_upcoming then
      raise exception 'booking_limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger appointments_customer_limit
  before insert on public.appointments
  for each row execute function app.enforce_customer_booking_limit();

/** …and at most max_waiting active waiting-list requests. */
create function app.enforce_customer_waitlist_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_staff() and new.customer_id = app.current_customer_id() then
    perform pg_advisory_xact_lock(hashtextextended('customer-limit:' || new.customer_id::text, 0));
    if (
      select count(*) from public.waitlist_entries w
      where w.customer_id = new.customer_id and w.status in ('waiting', 'offered')
    ) >= (app.customer_limits()).max_waiting then
      raise exception 'waitlist_limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger waitlist_customer_limit
  before insert on public.waitlist_entries
  for each row execute function app.enforce_customer_waitlist_limit();

-- ── Privileges (new functions are executable by PUBLIC until revoked) ───────
revoke all on function
  app.normalize_il_mobile(text),
  app.customer_limits(),
  app.enforce_customer_booking_limit(),
  app.enforce_customer_waitlist_limit()
from public, anon, authenticated;

revoke all on function public.register_customer(text, text) from public, anon;
grant execute on function public.register_customer(text, text) to authenticated;
