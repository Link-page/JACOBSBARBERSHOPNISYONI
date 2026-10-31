-- JACOB'S — appointment operations.
-- Clients cannot write appointments directly (see 0006_rls.sql); every change
-- goes through these functions, which check permissions, serialise work per
-- barber and re-validate availability inside the transaction.

/** Serialises schedule changes for one barber until the transaction ends. */
create function app.lock_barber(p_barber uuid) returns void
language sql as $$
  select pg_advisory_xact_lock(hashtextextended('barber:' || p_barber::text, 0))
$$;

/** Locks two barbers in a fixed order so concurrent moves can't deadlock. */
create function app.lock_barbers(p_a uuid, p_b uuid) returns void
language plpgsql as $$
begin
  perform app.lock_barber(least(p_a, p_b));
  if p_a <> p_b then
    perform app.lock_barber(greatest(p_a, p_b));
  end if;
end $$;

create function app.slot_unavailable() returns void language plpgsql as $$
begin
  raise exception 'slot_unavailable' using errcode = 'P0001';
end $$;

/** Price a barber charges for a service (currently the service price). */
create function app.service_price(p_service uuid) returns numeric
language sql stable security definer set search_path = public, pg_temp as $$
  select price from public.services where id = p_service
$$;

/**
 * Returns the signed-in user's customer record, creating it on first booking.
 * Never links to an existing record by phone number: that would let anyone
 * claim another person's history by typing their number.
 */
create function app.ensure_customer(p_full_name text, p_phone text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid := app.current_customer_id();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_id is null then
    if coalesce(trim(p_full_name), '') = '' then
      raise exception 'customer_details_required' using errcode = 'P0001';
    end if;
    insert into public.customers (profile_id, full_name, phone, created_by)
    values (auth.uid(), trim(p_full_name), app.normalize_phone(p_phone), auth.uid())
    returning id into v_id;
  elsif coalesce(trim(p_full_name), '') <> '' or app.normalize_phone(p_phone) is not null then
    update public.customers
    set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(app.normalize_phone(p_phone), phone)
    where id = v_id;
  end if;
  return v_id;
end $$;

/** Inserts an appointment, turning a constraint race into slot_unavailable. */
create function app.insert_appointment(
  p_customer uuid, p_barber uuid, p_service uuid, p_start timestamptz, p_duration int, p_notes text
) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.appointments;
begin
  insert into public.appointments (customer_id, barber_id, service_id, starts_at, ends_at, price, notes, created_by)
  values (p_customer, p_barber, p_service, p_start, p_start + make_interval(mins => p_duration),
          app.service_price(p_service), coalesce(p_notes, ''), auth.uid())
  returning * into v_row;
  return v_row;
exception when exclusion_violation then
  perform app.slot_unavailable();
end $$;

/**
 * Customer self-booking. The slot must be one get_day_slots would offer right now.
 * With p_barber null ("any barber"), the first free barber in display order is used.
 */
create function public.book_appointment(
  p_service uuid,
  p_starts_at timestamptz,
  p_barber uuid default null,
  p_full_name text default null,
  p_phone text default null,
  p_notes text default ''
) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_customer uuid := app.ensure_customer(p_full_name, p_phone);
  v_barber uuid;
begin
  for v_barber in
    select b.id from public.barbers b
    where b.active and (p_barber is null or b.id = p_barber)
      and app.service_duration(b.id, p_service) is not null
    order by b.sort_order, b.id
  loop
    perform app.lock_barber(v_barber);
    if exists (
      select 1 from public.get_day_slots(p_service, app.local_date(p_starts_at), v_barber) g
      where g.starts_at = p_starts_at
    ) then
      return app.insert_appointment(v_customer, v_barber, p_service, p_starts_at,
                                    app.service_duration(v_barber, p_service), p_notes);
    end if;
  end loop;
  perform app.slot_unavailable();
end $$;

/**
 * Staff booking (phone, walk-in, manual). Owners book anyone; a barber books
 * only their own chair. Staff aren't bound to the lead time or the slot grid,
 * but hours, breaks, blocks and other appointments still apply.
 */
create function public.staff_create_appointment(
  p_customer uuid, p_barber uuid, p_service uuid, p_starts_at timestamptz, p_notes text default ''
) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duration int;
begin
  if not app.can_manage_barber(p_barber) then
    perform app.forbid();
  end if;
  if not exists (select 1 from public.customers where id = p_customer) then
    raise exception 'customer_not_found' using errcode = 'P0001';
  end if;
  v_duration := app.service_duration(p_barber, p_service);
  if v_duration is null then
    raise exception 'service_not_offered' using errcode = 'P0001';
  end if;
  perform app.lock_barber(p_barber);
  if not app.is_bookable(p_barber, p_starts_at, p_starts_at + make_interval(mins => v_duration)) then
    perform app.slot_unavailable();
  end if;
  return app.insert_appointment(p_customer, p_barber, p_service, p_starts_at, v_duration, p_notes);
end $$;

/** Whether the signed-in user may change this appointment, and as whom. */
create function app.appointment_actor(p_appointment public.appointments) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if app.can_manage_barber(p_appointment.barber_id) then
    return 'staff';
  end if;
  if p_appointment.customer_id = app.current_customer_id() then
    return 'customer';
  end if;
  return null;
end $$;

/** Customers may change a booking only up to the cancellation notice period. */
create function app.assert_customer_notice(p_appointment public.appointments) returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_appointment.starts_at - now() < make_interval(hours => (app.settings()).cancellation_notice_hours) then
    raise exception 'too_late_to_change' using errcode = 'P0001';
  end if;
end $$;

/**
 * Moves an active appointment to a new start (and optionally another barber).
 * Frees the old time for the waiting list.
 */
create function public.reschedule_appointment(p_id uuid, p_starts_at timestamptz, p_barber uuid default null)
returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_old public.appointments;
  v_new public.appointments;
  v_actor text;
  v_barber uuid;
  v_duration int;
begin
  select * into v_old from public.appointments where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_actor := app.appointment_actor(v_old);
  v_barber := coalesce(p_barber, v_old.barber_id);
  if v_actor is null or (v_actor = 'staff' and not app.can_manage_barber(v_barber)) then
    perform app.forbid();
  end if;
  perform app.lock_barbers(v_old.barber_id, v_barber);
  select * into v_old from public.appointments where id = p_id for update;
  if v_old.status <> 'booked' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  v_duration := app.service_duration(v_barber, v_old.service_id);
  if v_duration is null then
    raise exception 'service_not_offered' using errcode = 'P0001';
  end if;
  if v_actor = 'customer' then
    perform app.assert_customer_notice(v_old);
    if p_starts_at < now() + make_interval(mins => (app.settings()).lead_time_minutes)
       or not exists (
         select 1 from app.candidate_starts(v_old.service_id, app.local_date(p_starts_at), v_barber) c
         where c.starts_at = p_starts_at
       ) then
      perform app.slot_unavailable();
    end if;
  end if;
  if not app.is_bookable(v_barber, p_starts_at, p_starts_at + make_interval(mins => v_duration), p_id) then
    perform app.slot_unavailable();
  end if;
  begin
    update public.appointments
    set barber_id = v_barber,
        starts_at = p_starts_at,
        ends_at = p_starts_at + make_interval(mins => v_duration),
        updated_at = now()
    where id = p_id
    returning * into v_new;
  exception when exclusion_violation then
    perform app.slot_unavailable();
  end;
  perform app.offer_freed_time(v_old.barber_id, app.local_date(v_old.starts_at));
  return v_new;
end $$;

create function public.cancel_appointment(p_id uuid, p_reason text default '')
returns public.appointments
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
  if v_row.status <> 'booked' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if v_actor = 'customer' then
    perform app.assert_customer_notice(v_row);
  end if;
  update public.appointments
  set status = 'cancelled',
      notes = case when coalesce(trim(p_reason), '') = '' then notes
                   else trim(both e'\n' from notes || e'\n' || 'ביטול: ' || trim(p_reason)) end,
      updated_at = now()
  where id = p_id
  returning * into v_row;
  perform app.offer_freed_time(v_row.barber_id, app.local_date(v_row.starts_at));
  return v_row;
end $$;

/** Staff mark the outcome of a visit: completed or no-show (correctable either way). */
create function public.set_appointment_status(p_id uuid, p_status public.appointment_status)
returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.appointments;
begin
  select * into v_row from public.appointments where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not app.can_manage_barber(v_row.barber_id) then
    perform app.forbid();
  end if;
  if p_status not in ('completed', 'no_show') or v_row.status not in ('booked', 'completed', 'no_show') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  begin
    update public.appointments set status = p_status, updated_at = now()
    where id = p_id returning * into v_row;
  exception when exclusion_violation then
    perform app.slot_unavailable();
  end;
  return v_row;
end $$;

/** Staff edit service and notes. A new service re-validates the (possibly longer) time. */
create function public.update_appointment(p_id uuid, p_service uuid default null, p_notes text default null)
returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.appointments;
  v_duration int;
begin
  select * into v_row from public.appointments where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not app.can_manage_barber(v_row.barber_id) then
    perform app.forbid();
  end if;
  perform app.lock_barber(v_row.barber_id);
  select * into v_row from public.appointments where id = p_id for update;
  if p_service is not null and p_service <> v_row.service_id then
    if v_row.status <> 'booked' then
      raise exception 'invalid_status' using errcode = 'P0001';
    end if;
    v_duration := app.service_duration(v_row.barber_id, p_service);
    if v_duration is null then
      raise exception 'service_not_offered' using errcode = 'P0001';
    end if;
    if not app.is_bookable(v_row.barber_id, v_row.starts_at,
                           v_row.starts_at + make_interval(mins => v_duration), p_id) then
      perform app.slot_unavailable();
    end if;
    update public.appointments
    set service_id = p_service,
        ends_at = starts_at + make_interval(mins => v_duration),
        price = app.service_price(p_service),
        updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  if p_notes is not null then
    update public.appointments set notes = p_notes, updated_at = now()
    where id = p_id returning * into v_row;
  end if;
  return v_row;
end $$;

/** Staff find-or-create a customer by phone (for phone and walk-in bookings). */
create function public.staff_upsert_customer(p_full_name text, p_phone text default null)
returns public.customers
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.customers;
  v_phone text := app.normalize_phone(p_phone);
begin
  if not app.is_staff() then
    perform app.forbid();
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'customer_details_required' using errcode = 'P0001';
  end if;
  if v_phone is not null then
    select * into v_row from public.customers where phone = v_phone order by created_at limit 1;
    if found then
      -- A barber who reaches an existing customer by phone may now serve them.
      return v_row;
    end if;
  end if;
  insert into public.customers (full_name, phone, created_by)
  values (trim(p_full_name), v_phone, auth.uid())
  returning * into v_row;
  return v_row;
end $$;

/** Audit trail of one appointment, for staff who can manage it. */
create function public.get_appointment_history(p_id uuid)
returns setof public.audit_log
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_barber uuid;
begin
  select barber_id into v_barber from public.appointments where id = p_id;
  if v_barber is null or not app.can_manage_barber(v_barber) then
    perform app.forbid();
  end if;
  return query
    select * from public.audit_log
    where entity = 'appointments' and entity_id = p_id::text
    order by created_at, id;
end $$;
