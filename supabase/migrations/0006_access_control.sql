-- JACOB'S — access control.
-- Default-deny: revoke everything, then grant the minimum each role needs.
-- Row Level Security decides which rows; column grants decide which columns.
-- Appointment and waiting-list writes are only possible through the
-- SECURITY DEFINER functions in 0004/0005.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;
grant usage on schema app to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.breaks enable row level security;
alter table public.time_blocks enable row level security;
alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;
alter table public.appointments enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.gallery_items enable row level security;
alter table public.audit_log enable row level security;

-- Helpers used inside policies.
grant execute on function
  app.current_role(), app.is_owner(), app.is_staff(), app.current_barber_id(),
  app.current_customer_id(), app.can_manage_barber(uuid), app.can_see_customer(uuid),
  app.barber_can_see_customer(uuid)
to anon, authenticated;

-- ── Public catalogue: readable by everyone, managed by the owner ─────────────
grant select on public.business_settings, public.barbers, public.services, public.barber_services,
                public.working_hours, public.breaks, public.gallery_items to anon, authenticated;
grant insert, update, delete on public.barbers, public.services, public.barber_services,
                public.working_hours, public.gallery_items to authenticated;
grant update on public.business_settings to authenticated;
grant insert, update, delete on public.breaks to authenticated;

create policy settings_read on public.business_settings for select using (true);
create policy settings_owner_write on public.business_settings for update to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy barbers_read on public.barbers for select using (active or app.is_staff());
create policy barbers_owner_write on public.barbers for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy services_read on public.services for select using (active or app.is_staff());
create policy services_owner_write on public.services for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy barber_services_read on public.barber_services for select using (true);
create policy barber_services_owner_write on public.barber_services for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy working_hours_read on public.working_hours for select using (true);
create policy working_hours_owner_write on public.working_hours for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

-- Barbers manage their own breaks; the owner manages everyone's.
create policy breaks_read on public.breaks for select using (true);
create policy breaks_write on public.breaks for all to authenticated
  using (app.can_manage_barber(barber_id)) with check (app.can_manage_barber(barber_id));

create policy gallery_read on public.gallery_items for select using (active or app.is_owner());
create policy gallery_owner_write on public.gallery_items for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

-- ── Profiles: own row; the owner sees everyone. Role is not client-writable. ─
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_owner());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── Time blocks: staff only. Shop-wide blocks (barber_id null) are owner-only. ─
grant select, insert, update, delete on public.time_blocks to authenticated;
create policy time_blocks_read on public.time_blocks for select to authenticated
  using (app.is_owner() or (app.is_staff() and (barber_id is null or barber_id = app.current_barber_id())));
create policy time_blocks_write on public.time_blocks for all to authenticated
  using (app.is_owner() or (barber_id is not null and app.can_manage_barber(barber_id)))
  with check (app.is_owner() or (barber_id is not null and app.can_manage_barber(barber_id)));

-- ── Customers and notes: never public ───────────────────────────────────────
grant select on public.customers to authenticated;
grant update (full_name, phone) on public.customers to authenticated;
grant delete on public.customers to authenticated;
create policy customers_read on public.customers for select to authenticated
  using (app.can_see_customer(id));
create policy customers_owner_update on public.customers for update to authenticated
  using (app.is_owner()) with check (app.is_owner());
create policy customers_owner_delete on public.customers for delete to authenticated
  using (app.is_owner());

grant select, insert, delete on public.customer_notes to authenticated;
create policy notes_read on public.customer_notes for select to authenticated
  using (app.is_owner() or app.barber_can_see_customer(customer_id));
create policy notes_insert on public.customer_notes for insert to authenticated
  with check (author_id = auth.uid() and (app.is_owner() or app.barber_can_see_customer(customer_id)));
create policy notes_delete on public.customer_notes for delete to authenticated
  using (app.is_owner() or author_id = auth.uid());

-- ── Appointments and waiting list: read by those involved; writes via functions ─
grant select on public.appointments, public.waitlist_entries to authenticated;
create policy appointments_read on public.appointments for select to authenticated
  using (app.can_manage_barber(barber_id) or customer_id = app.current_customer_id());
create policy waitlist_read on public.waitlist_entries for select to authenticated
  using (
    app.is_owner()
    or customer_id = app.current_customer_id()
    or (app.current_barber_id() is not null
        and (barber_id is null or barber_id = app.current_barber_id()))
  );

-- ── Owner-only records ──────────────────────────────────────────────────────
grant select on public.notifications, public.audit_log to authenticated;
create policy notifications_owner_read on public.notifications for select to authenticated
  using (app.is_owner());
create policy audit_owner_read on public.audit_log for select to authenticated
  using (app.is_owner());

-- ── Owner administration ────────────────────────────────────────────────────

/**
 * Gives a signed-up account a role and (for barbers) links it to a barber.
 * The last owner cannot demote themselves.
 */
create function public.admin_set_user_role(p_email text, p_role public.app_role, p_barber uuid default null)
returns public.profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid;
  v_profile public.profiles;
begin
  if not app.is_owner() then
    perform app.forbid();
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_user = auth.uid() and p_role <> 'owner'
     and (select count(*) from public.profiles where role = 'owner') <= 1 then
    raise exception 'last_owner' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = v_user returning * into v_profile;
  update public.barbers set user_id = null where user_id = v_user and (p_barber is null or id <> p_barber);
  if p_barber is not null then
    update public.barbers set user_id = v_user where id = p_barber;
  end if;
  return v_profile;
end $$;

/** Sets the customer-facing order of services. */
create function public.reorder_services(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_owner() then
    perform app.forbid();
  end if;
  update public.services s set sort_order = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where s.id = o.id;
end $$;

-- ── Callable API ────────────────────────────────────────────────────────────
grant execute on function
  public.get_day_slots(uuid, date, uuid),
  public.get_month_availability(uuid, date, uuid),
  public.get_next_available(uuid, uuid)
to anon, authenticated;

grant execute on function
  public.book_appointment(uuid, timestamptz, uuid, text, text, text),
  public.reschedule_appointment(uuid, timestamptz, uuid),
  public.cancel_appointment(uuid, text),
  public.join_waitlist(uuid, date, uuid, text, text),
  public.claim_waitlist_offer(uuid),
  public.remove_waitlist_entry(uuid),
  public.staff_create_appointment(uuid, uuid, uuid, timestamptz, text),
  public.set_appointment_status(uuid, public.appointment_status),
  public.update_appointment(uuid, uuid, text),
  public.staff_upsert_customer(text, text),
  public.get_appointment_history(uuid),
  public.staff_offer_waitlist_slot(uuid, timestamptz, uuid),
  public.staff_day_capacity(date),
  public.run_waitlist_maintenance(),
  public.admin_set_user_role(text, public.app_role, uuid),
  public.reorder_services(uuid[])
to authenticated;
