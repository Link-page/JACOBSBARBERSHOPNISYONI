-- ════════════════════════════════════════════════════════════════════════════
-- 0013 · Waiting list: notify everyone, hold nothing
--
-- Replaces 0005's exclusive offers (one customer at a time, slot held until the
-- offer expired). Now, when booked time is freed — cancelled by anyone, moved,
-- or auto-cancelled for no confirmation — every customer waiting for that day
-- whose service fits the freed time gets an inbox message and a push. Nothing is
-- reserved: the first customer whose booking commits gets the time; everyone
-- else gets slot_unavailable ("התור כבר נתפס"). The exclusion constraint on
-- appointments still makes overlapping bookings impossible.
--
-- One notification per freed time per customer: the event and each message are
-- de-duplicated by key, so re-running anything never notifies twice.
-- ════════════════════════════════════════════════════════════════════════════

-- Release any open holds so their time is bookable by anyone.
update public.waitlist_entries
set status = 'waiting', offered_starts_at = null, offered_barber_id = null, offer_expires_at = null, updated_at = now()
where status = 'offered';

-- Retire the offer mechanism (callers in 0004/0005 keep working; they now do nothing).
create or replace function app.offer_freed_time(p_barber uuid, p_date date) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Superseded by app.announce_freed_time (trigger below).
end $$;

create or replace function public.claim_waitlist_offer(p_entry uuid) returns public.appointments
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'offers_retired' using errcode = 'P0001';
end $$;

create or replace function public.staff_offer_waitlist_slot(p_entry uuid, p_starts_at timestamptz, p_barber uuid)
returns public.waitlist_entries
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'offers_retired' using errcode = 'P0001';
end $$;

/**
 * Notifies every customer waiting for the freed time's day (that barber, or any
 * barber) whose service can now be booked overlapping [p_start, p_end).
 * Returns how many were notified (0 when this freed time was already announced).
 */
create function app.announce_freed_time(p_appointment uuid, p_barber uuid, p_start timestamptz, p_end timestamptz) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_date date := app.local_date(p_start);
  v_stamp bigint := extract(epoch from p_start)::bigint;
  v_event uuid;
  v_entry record;
  v_duration int;
  v_barber_name text := (select name from public.barbers where id = p_barber);
  v_count int := 0;
begin
  v_event := app.record_event('slot_freed', format('slot-freed:%s:%s', p_appointment, v_stamp),
    jsonb_build_object('barber_id', p_barber, 'starts_at', p_start, 'ends_at', p_end));
  if v_event is null then
    return 0;
  end if;
  for v_entry in
    select w.service_id, c.profile_id
    from public.waitlist_entries w
    join public.customers c on c.id = w.customer_id
    where w.status = 'waiting' and w.wanted_date = v_date
      and (w.barber_id is null or w.barber_id = p_barber)
      and c.profile_id is not null
  loop
    v_duration := app.service_duration(p_barber, v_entry.service_id);
    continue when v_duration is null;
    -- Eligible only if a bookable start for their service now overlaps the freed time.
    continue when not exists (
      select 1 from public.get_day_slots(v_entry.service_id, v_date, p_barber) g
      where g.starts_at < p_end and g.starts_at + make_interval(mins => v_duration) > p_start
    );
    if app.notify(v_entry.profile_id, 'waitlist_available', 'התפנה תור!',
         format('התפנה תור %s אצל %s. מי שקובע ראשון — מקבל.', app.appointment_when(p_start), v_barber_name),
         format('?go=book&service=%s&barber=%s&date=%s', v_entry.service_id, p_barber, v_date),
         format('slot-freed:%s:%s:%s', p_appointment, v_stamp, v_entry.profile_id),
         p_event => v_event) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

/** Booked time in the future was freed (cancelled, moved, or marked otherwise): announce it. */
create function app.on_appointment_freed() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.status = 'booked' and old.starts_at > now()
     and (new.status <> 'booked' or new.starts_at <> old.starts_at or new.barber_id <> old.barber_id) then
    perform app.announce_freed_time(old.id, old.barber_id, old.starts_at, old.ends_at);
  end if;
  return null;
end $$;

create trigger appointments_announce_freed
  after update on public.appointments
  for each row execute function app.on_appointment_freed();

/** A customer who books the day they were waiting for leaves that waiting list. */
create function app.fulfil_waitlist() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.waitlist_entries
  set status = 'booked', appointment_id = new.id, updated_at = now()
  where customer_id = new.customer_id and status = 'waiting'
    and wanted_date = app.local_date(new.starts_at) and service_id = new.service_id
    and (barber_id is null or barber_id = new.barber_id);
  return null;
end $$;

create trigger appointments_fulfil_waitlist
  after insert on public.appointments
  for each row execute function app.fulfil_waitlist();

revoke all on function
  app.announce_freed_time(uuid, uuid, timestamptz, timestamptz),
  app.on_appointment_freed(),
  app.fulfil_waitlist()
from public, anon, authenticated;
