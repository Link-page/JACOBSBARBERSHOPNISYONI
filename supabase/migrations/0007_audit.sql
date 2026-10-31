-- JACOB'S — audit trail.
-- Every change to schedule, catalogue, customers and settings is recorded with
-- the acting user. Readable by the owner only (see 0006).

create function app.audit_row() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_details jsonb;
begin
  if tg_op = 'UPDATE' then
    -- Only the columns that changed, as {column: [old, new]}.
    select coalesce(jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)), '{}'::jsonb)
    into v_details
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if v_details = '{}'::jsonb then
      return new;
    end if;
  else
    v_details := v_row;
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'barber_id'), v_details);
  return coalesce(new, old);
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments', 'waitlist_entries', 'customers', 'customer_notes', 'barbers', 'services',
    'barber_services', 'working_hours', 'breaks', 'time_blocks', 'business_settings', 'gallery_items'
  ] loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function app.audit_row()', t);
  end loop;
end $$;
