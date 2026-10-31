-- JACOB'S — availability.
-- Availability is computed only here, so the customer app, the admin app and
-- every booking function agree on what is free.

create function app.settings() returns public.business_settings
language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.business_settings where id
$$;

/** Minutes a barber needs for a service; null when the barber doesn't offer it or it's disabled. */
create function app.service_duration(p_barber uuid, p_service uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(bs.duration_minutes, s.duration_minutes)
  from public.barber_services bs
  join public.services s on s.id = bs.service_id
  where bs.barber_id = p_barber and bs.service_id = p_service and s.active
$$;

/** Local calendar date of an instant in the shop's time zone. */
create function app.local_date(p_at timestamptz) returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select (p_at at time zone (app.settings()).timezone)::date
$$;

/**
 * Whether [p_start, p_end) is free for a barber: inside working hours, outside
 * breaks, blocks and other appointments, and not held by an open waiting-list
 * offer. p_ignore_appointment lets an appointment be moved within its own time;
 * p_claiming_entry lets the customer holding an offer claim it.
 */
create function app.is_bookable(
  p_barber uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_ignore_appointment uuid default null,
  p_claiming_entry uuid default null
) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  tz text := (app.settings()).timezone;
  local_start timestamp := p_start at time zone tz;
  local_end timestamp := p_end at time zone tz;
  dow smallint := extract(dow from local_start);
begin
  if p_end <= p_start or local_start::date <> local_end::date then
    return false;
  end if;
  if not exists (select 1 from public.barbers where id = p_barber and active) then
    return false;
  end if;
  if not exists (
    select 1 from public.working_hours w
    where w.barber_id = p_barber and w.weekday = dow
      and local_start::time >= w.start_time and local_end::time <= w.end_time
  ) then
    return false;
  end if;
  if exists (
    select 1 from public.breaks k
    where k.barber_id = p_barber and k.weekday = dow
      and k.start_time < local_end::time and k.end_time > local_start::time
  ) then
    return false;
  end if;
  if exists (
    select 1 from public.time_blocks t
    where (t.barber_id = p_barber or t.barber_id is null)
      and tstzrange(t.starts_at, t.ends_at) && tstzrange(p_start, p_end)
  ) then
    return false;
  end if;
  if exists (
    select 1 from public.appointments a
    where a.barber_id = p_barber and a.status in ('booked', 'completed')
      and a.id is distinct from p_ignore_appointment
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_start, p_end)
  ) then
    return false;
  end if;
  if exists (
    select 1 from public.waitlist_entries o
    where o.status = 'offered' and o.offer_expires_at > now()
      and o.offered_barber_id = p_barber
      and o.id is distinct from p_claiming_entry
      and tstzrange(o.offered_starts_at, o.offered_starts_at
            + make_interval(mins => coalesce(app.service_duration(o.offered_barber_id, o.service_id), 0)))
          && tstzrange(p_start, p_end)
  ) then
    return false;
  end if;
  return true;
end $$;

/**
 * Every start time on the shop's grid (working start + n × slot step) where the
 * service fits a barber's hours on p_date — before checking bookings.
 */
create function app.candidate_starts(p_service uuid, p_date date, p_barber uuid default null)
returns table (barber_id uuid, sort_order int, starts_at timestamptz, duration int)
language sql stable security definer set search_path = public, pg_temp as $$
  with s as (select * from app.settings())
  select b.id, b.sort_order, (ls at time zone s.timezone), d.duration
  from public.barbers b
  cross join s
  cross join lateral (select app.service_duration(b.id, p_service) as duration) d
  join public.working_hours w on w.barber_id = b.id and w.weekday = extract(dow from p_date)
  cross join lateral generate_series(
    p_date + w.start_time,
    p_date + w.end_time - make_interval(mins => d.duration),
    make_interval(mins => s.slot_step_minutes)
  ) ls
  where b.active and d.duration is not null and (p_barber is null or b.id = p_barber)
$$;

/** Open start times on p_date, each with the barbers free then (first = suggested). */
create function public.get_day_slots(p_service uuid, p_date date, p_barber uuid default null)
returns table (starts_at timestamptz, barber_ids uuid[])
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  s public.business_settings := app.settings();
  today date := app.local_date(now());
begin
  if p_date < today or p_date > today + s.booking_window_days then
    return;
  end if;
  return query
    select c.starts_at, array_agg(c.barber_id order by c.sort_order, c.barber_id)
    from app.candidate_starts(p_service, p_date, p_barber) c
    where c.starts_at >= now() + make_interval(mins => s.lead_time_minutes)
      and app.is_bookable(c.barber_id, c.starts_at, c.starts_at + make_interval(mins => c.duration))
    group by c.starts_at
    order by c.starts_at;
end $$;

/**
 * Day-by-day status for a month view:
 * available | full (open, every slot taken → waiting list) | closed | past | unavailable (beyond window).
 */
create function public.get_month_availability(p_service uuid, p_month date, p_barber uuid default null)
returns table (day date, status text, free_slots int)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  s public.business_settings := app.settings();
  today date := app.local_date(now());
  d date;
  free int;
begin
  for d in
    select generate_series(date_trunc('month', p_month)::date,
                           (date_trunc('month', p_month) + interval '1 month - 1 day')::date,
                           interval '1 day')::date
  loop
    if d < today then
      day := d; status := 'past'; free_slots := 0;
    elsif d > today + s.booking_window_days then
      day := d; status := 'unavailable'; free_slots := 0;
    elsif not exists (select 1 from app.candidate_starts(p_service, d, p_barber))
       or exists (
         select 1 from public.time_blocks t
         where t.barber_id is null
           and t.starts_at <= (d::timestamp at time zone s.timezone)
           and t.ends_at >= ((d + 1)::timestamp at time zone s.timezone)
       ) then
      day := d; status := 'closed'; free_slots := 0;
    else
      select count(*) into free from public.get_day_slots(p_service, d, p_barber);
      day := d; free_slots := free;
      if free > 0 then
        status := 'available';
      elsif d = today and not exists (
        select 1 from app.candidate_starts(p_service, d, p_barber) c
        where c.starts_at >= now() + make_interval(mins => s.lead_time_minutes)
      ) then
        status := 'past';
      else
        status := 'full';
      end if;
    end if;
    return next;
  end loop;
end $$;

/** The earliest open slot within the booking window. */
create function public.get_next_available(p_service uuid, p_barber uuid default null)
returns table (starts_at timestamptz, barber_id uuid)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  s public.business_settings := app.settings();
  d date := app.local_date(now());
begin
  for i in 0..s.booking_window_days loop
    return query
      select g.starts_at, g.barber_ids[1] from public.get_day_slots(p_service, d + i, p_barber) g
      order by g.starts_at limit 1;
    if found then return; end if;
  end loop;
end $$;

/**
 * Staff view of a day: per barber, how many grid slots exist and how many are
 * still free (one slot step long). Drives occupancy statistics.
 */
create function public.staff_day_capacity(p_date date)
returns table (barber_id uuid, total_slots int, free_slots int)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  s public.business_settings := app.settings();
begin
  if not app.is_staff() then
    perform app.forbid();
  end if;
  return query
    select b.id,
           count(*)::int,
           count(*) filter (where app.is_bookable(b.id, ls_tz, ls_tz + make_interval(mins => s.slot_step_minutes)))::int
    from public.barbers b
    join public.working_hours w on w.barber_id = b.id and w.weekday = extract(dow from p_date)
    cross join lateral generate_series(
      p_date + w.start_time,
      p_date + w.end_time - make_interval(mins => s.slot_step_minutes),
      make_interval(mins => s.slot_step_minutes)
    ) ls
    cross join lateral (select (ls at time zone s.timezone) as ls_tz) z
    where b.active and app.can_manage_barber(b.id)
    group by b.id;
end $$;
