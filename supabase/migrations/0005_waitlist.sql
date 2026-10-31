-- JACOB'S — waiting list.
--
-- Allocation policy
--   1. A customer may join the list for a day only when it has no free slot for them.
--   2. When time frees up (cancellation, reschedule, expired offer), waiting requests
--      for that day are considered oldest-first. Each gets at most one open offer:
--      the earliest free slot that fits its service and barber choice.
--   3. An open offer holds its slot (is_bookable treats it as taken for everyone
--      else) until offer_expires_at, so one slot is never promised twice.
--   4. claim_waitlist_offer books the held slot atomically; an unclaimed offer
--      expires through run_waitlist_maintenance and the slot passes to the next request.
--   5. Each offer queues a message in `notifications` with status 'pending'.
--      Nothing is sent until a delivery provider is connected.

create function app.offer_message(p_entry public.waitlist_entries) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select format('התפנה תור ב-%s בשעה %s. התור שמור עבורך עד %s.',
                to_char(p_entry.offered_starts_at at time zone s.timezone, 'DD/MM'),
                to_char(p_entry.offered_starts_at at time zone s.timezone, 'HH24:MI'),
                to_char(p_entry.offer_expires_at at time zone s.timezone, 'HH24:MI'))
  from app.settings() s
$$;

/** Offers free slots on p_date (for p_barber's chair) to waiting requests, oldest first. */
create function app.offer_freed_time(p_barber uuid, p_date date) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entry public.waitlist_entries;
  v_slot record;
begin
  for v_entry in
    select * from public.waitlist_entries
    where wanted_date = p_date and status = 'waiting'
      and (barber_id is null or barber_id = p_barber)
    order by created_at, id
    for update skip locked
  loop
    select g.starts_at, g.barber_ids[1] as barber_id into v_slot
    from public.get_day_slots(v_entry.service_id, p_date, v_entry.barber_id) g
    order by g.starts_at
    limit 1;
    continue when v_slot.starts_at is null;

    update public.waitlist_entries
    set status = 'offered',
        offered_starts_at = v_slot.starts_at,
        offered_barber_id = v_slot.barber_id,
        offer_expires_at = now() + make_interval(mins => (app.settings()).waitlist_offer_minutes),
        updated_at = now()
    where id = v_entry.id
    returning * into v_entry;

    insert into public.notifications (customer_id, waitlist_entry_id, channel, message)
    values (v_entry.customer_id, v_entry.id, 'sms', app.offer_message(v_entry));
  end loop;
end $$;

/** Customer joins the waiting list for a full day. Idempotent per service/day/barber choice. */
create function public.join_waitlist(
  p_service uuid,
  p_date date,
  p_barber uuid default null,
  p_full_name text default null,
  p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_customer uuid := app.ensure_customer(p_full_name, p_phone);
  v_entry public.waitlist_entries;
begin
  select * into v_entry from public.waitlist_entries
  where customer_id = v_customer and service_id = p_service and wanted_date = p_date
    and barber_id is not distinct from p_barber and status in ('waiting', 'offered');
  if found then
    return jsonb_build_object('entry', to_jsonb(v_entry), 'already_on_list', true);
  end if;
  if exists (select 1 from public.get_day_slots(p_service, p_date, p_barber)) then
    raise exception 'slots_available' using errcode = 'P0001';
  end if;
  if not exists (select 1 from app.candidate_starts(p_service, p_date, p_barber)) then
    raise exception 'day_closed' using errcode = 'P0001';
  end if;
  begin
    insert into public.waitlist_entries (customer_id, barber_id, service_id, wanted_date)
    values (v_customer, p_barber, p_service, p_date)
    returning * into v_entry;
  exception when unique_violation then
    -- A concurrent request for the same customer won the race.
    select * into v_entry from public.waitlist_entries
    where customer_id = v_customer and service_id = p_service and wanted_date = p_date
      and barber_id is not distinct from p_barber and status in ('waiting', 'offered');
    return jsonb_build_object('entry', to_jsonb(v_entry), 'already_on_list', true);
  end;
  return jsonb_build_object('entry', to_jsonb(v_entry), 'already_on_list', false);
end $$;

/** The offered customer books their held slot. */
create function public.claim_waitlist_offer(p_entry uuid) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entry public.waitlist_entries;
  v_row public.appointments;
  v_duration int;
begin
  select * into v_entry from public.waitlist_entries where id = p_entry;
  if not found or v_entry.customer_id is distinct from app.current_customer_id() then
    perform app.forbid();
  end if;
  perform app.lock_barber(v_entry.offered_barber_id);
  select * into v_entry from public.waitlist_entries where id = p_entry for update;
  if v_entry.status <> 'offered' or v_entry.offer_expires_at <= now() then
    raise exception 'offer_expired' using errcode = 'P0001';
  end if;
  v_duration := app.service_duration(v_entry.offered_barber_id, v_entry.service_id);
  if v_duration is null or not app.is_bookable(
       v_entry.offered_barber_id, v_entry.offered_starts_at,
       v_entry.offered_starts_at + make_interval(mins => v_duration), null, v_entry.id) then
    perform app.slot_unavailable();
  end if;
  v_row := app.insert_appointment(v_entry.customer_id, v_entry.offered_barber_id, v_entry.service_id,
                                  v_entry.offered_starts_at, v_duration, '');
  update public.waitlist_entries
  set status = 'booked', appointment_id = v_row.id, updated_at = now()
  where id = p_entry;
  return v_row;
end $$;

/** Staff offer a specific slot to a waiting customer (manual allocation). */
create function public.staff_offer_waitlist_slot(p_entry uuid, p_starts_at timestamptz, p_barber uuid)
returns public.waitlist_entries
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entry public.waitlist_entries;
  v_duration int;
begin
  if not app.can_manage_barber(p_barber) then
    perform app.forbid();
  end if;
  perform app.lock_barber(p_barber);
  select * into v_entry from public.waitlist_entries where id = p_entry for update;
  if not found or v_entry.status not in ('waiting', 'offered')
     or (v_entry.barber_id is not null and v_entry.barber_id <> p_barber) then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  v_duration := app.service_duration(p_barber, v_entry.service_id);
  if v_duration is null or not app.is_bookable(
       p_barber, p_starts_at, p_starts_at + make_interval(mins => v_duration), null, v_entry.id) then
    perform app.slot_unavailable();
  end if;
  update public.waitlist_entries
  set status = 'offered', offered_starts_at = p_starts_at, offered_barber_id = p_barber,
      offer_expires_at = now() + make_interval(mins => (app.settings()).waitlist_offer_minutes),
      updated_at = now()
  where id = p_entry
  returning * into v_entry;
  insert into public.notifications (customer_id, waitlist_entry_id, channel, message)
  values (v_entry.customer_id, v_entry.id, 'sms', app.offer_message(v_entry));
  return v_entry;
end $$;

/** Removes a request: by staff responsible for it, or by the customer who made it. */
create function public.remove_waitlist_entry(p_entry uuid) returns public.waitlist_entries
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entry public.waitlist_entries;
  v_was_offer boolean;
begin
  select * into v_entry from public.waitlist_entries where id = p_entry for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (
    app.is_owner()
    or coalesce(v_entry.customer_id = app.current_customer_id(), false)
    or coalesce(coalesce(v_entry.barber_id, v_entry.offered_barber_id) = app.current_barber_id(), false)
  ) then
    perform app.forbid();
  end if;
  v_was_offer := v_entry.status = 'offered';
  update public.waitlist_entries set status = 'removed', updated_at = now()
  where id = p_entry returning * into v_entry;
  if v_was_offer then
    perform app.offer_freed_time(v_entry.offered_barber_id, v_entry.wanted_date);
  end if;
  return v_entry;
end $$;

/**
 * Expires unclaimed offers and passes their slots on. Run on a schedule
 * (pg_cron, every few minutes) and from the admin app.
 */
create function public.run_waitlist_maintenance() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_expired record;
  v_count int := 0;
begin
  if auth.uid() is not null and not app.is_staff() then
    perform app.forbid();
  end if;
  for v_expired in
    update public.waitlist_entries
    set status = 'expired', updated_at = now()
    where status = 'offered' and offer_expires_at <= now()
    returning offered_barber_id, wanted_date
  loop
    v_count := v_count + 1;
    perform app.offer_freed_time(v_expired.offered_barber_id, v_expired.wanted_date);
  end loop;
  return v_count;
end $$;
