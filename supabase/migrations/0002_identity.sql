-- JACOB'S — identity and role helpers.
-- auth.uid() is provided by Supabase Auth. All helpers are SECURITY DEFINER so
-- RLS policies can call them without recursive policy evaluation.
-- Permission helpers always return true or false, never NULL: in PL/pgSQL,
-- `if not <null> then forbid()` would silently skip the check.

-- Every new auth user gets a profile with the least-privileged role.
create function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.phone);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

create function app.current_role() returns public.app_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

create function app.is_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app.current_role() = 'owner', false)
$$;

create function app.is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app.current_role() in ('owner', 'barber'), false)
$$;

/** The barber row linked to the signed-in staff account, if any (the owner may also be a barber). */
create function app.current_barber_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select b.id from public.barbers b where b.user_id = auth.uid() and app.is_staff()
$$;

create function app.current_customer_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from public.customers c where c.profile_id = auth.uid()
$$;

/** Owners manage every barber's schedule; a barber manages only their own. */
create function app.can_manage_barber(p_barber uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_owner() or coalesce(app.is_staff() and p_barber = app.current_barber_id(), false)
$$;

/** A barber may see a customer they have served, are booked with, or created. */
create function app.barber_can_see_customer(p_customer uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.current_barber_id() is not null and (
    exists (select 1 from public.appointments a where a.customer_id = p_customer and a.barber_id = app.current_barber_id())
    or exists (select 1 from public.waitlist_entries w where w.customer_id = p_customer and w.barber_id = app.current_barber_id())
    or exists (select 1 from public.customers c where c.id = p_customer and c.created_by = auth.uid())
  )
$$;

create function app.can_see_customer(p_customer uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_owner()
      or coalesce(p_customer = app.current_customer_id(), false)
      or app.barber_can_see_customer(p_customer)
$$;

create function app.normalize_phone(p_phone text) returns text
language sql immutable as $$
  select nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '')
$$;

create function app.forbid() returns void language plpgsql as $$
begin
  raise exception 'forbidden' using errcode = '42501';
end $$;
