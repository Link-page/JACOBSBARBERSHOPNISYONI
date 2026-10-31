-- JACOB'S — owner operations that change several rows at once, applied atomically.

/**
 * Replaces a barber's services (with optional duration overrides), weekly hours
 * and breaks in one transaction.
 *   p_services: [{"service_id": "...", "duration_minutes": 50 | null}]
 *   p_hours / p_breaks: [{"weekday": 0, "start": "09:00", "end": "20:00"}]
 */
create function public.admin_save_barber_schedule(p_barber uuid, p_services jsonb, p_hours jsonb, p_breaks jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_owner() then
    perform app.forbid();
  end if;
  if not exists (select 1 from public.barbers where id = p_barber) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  delete from public.barber_services where barber_id = p_barber;
  insert into public.barber_services (barber_id, service_id, duration_minutes)
  select p_barber, (e ->> 'service_id')::uuid, nullif(e ->> 'duration_minutes', '')::int
  from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) e;

  delete from public.working_hours where barber_id = p_barber;
  insert into public.working_hours (barber_id, weekday, start_time, end_time)
  select p_barber, (e ->> 'weekday')::smallint, (e ->> 'start')::time, (e ->> 'end')::time
  from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) e;

  delete from public.breaks where barber_id = p_barber;
  insert into public.breaks (barber_id, weekday, start_time, end_time)
  select p_barber, (e ->> 'weekday')::smallint, (e ->> 'start')::time, (e ->> 'end')::time
  from jsonb_array_elements(coalesce(p_breaks, '[]'::jsonb)) e;
end $$;

/** Sets exactly which barbers offer a service (keeping existing duration overrides). */
create function public.admin_set_service_barbers(p_service uuid, p_barbers uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_owner() then
    perform app.forbid();
  end if;
  delete from public.barber_services where service_id = p_service and not (barber_id = any (p_barbers));
  insert into public.barber_services (barber_id, service_id)
  select unnest(p_barbers), p_service
  on conflict do nothing;
end $$;

revoke all on function public.admin_save_barber_schedule(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.admin_set_service_barbers(uuid, uuid[]) from public, anon;
grant execute on function public.admin_save_barber_schedule(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.admin_set_service_barbers(uuid, uuid[]) to authenticated;
