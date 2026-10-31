-- ════════════════════════════════════════════════════════════════════════════
-- 0015 · Scheduler
--
-- app.run_scheduler() does the time-based work, idempotently, by the database
-- clock (no app needs to be open):
--   1. confirmation requests that are due
--   2. auto-cancel of appointments still unconfirmed at their deadline (if enabled)
--   3. reminders ~reminder_minutes_before the start, for confirmed appointments only
--   4. expiry of waiting-list requests for past days
--   5. clean-up of old inbox messages, deliveries and events
--
-- The existing cron job ('waitlist-maintenance' → run_waitlist_maintenance(),
-- see docs) now runs this. Every 1 minute is recommended.
-- ════════════════════════════════════════════════════════════════════════════

/** p_now is the moment to act as of (tests pass it; cron uses the default: now()). */
create function app.run_scheduler(p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_settings public.business_settings := app.settings();
  v_row public.appointments;
  v_requested int := 0;
  v_cancelled int := 0;
  v_reminded int := 0;
  v_expired int := 0;
begin
  -- 1. Confirmation requests.
  for v_row in
    select * from public.appointments
    where status = 'booked' and confirmation_status = 'pending' and confirmation_requested_at is null
      and confirmation_request_at <= p_now and starts_at > p_now
    for update skip locked
  loop
    perform app.notify(app.appointment_profile(v_row), 'confirmation_required', 'נא לאשר הגעה',
      format('התור שלך %s (%s). יש לאשר הגעה עד %s.',
        app.appointment_when(v_row.starts_at), app.appointment_what(v_row), app.appointment_when(v_row.confirmation_deadline)),
      '?go=appointment&id=' || v_row.id,
      format('confirm-request:%s:%s', v_row.id, extract(epoch from v_row.starts_at)::bigint), v_row.id);
    update public.appointments set confirmation_requested_at = p_now where id = v_row.id;
    v_requested := v_requested + 1;
  end loop;

  -- 2. Auto-cancel. Rows are locked and re-checked: a confirmation that committed first is never undone.
  if v_settings.auto_cancel_unconfirmed then
    for v_row in
      select * from public.appointments
      where status = 'booked' and confirmation_status = 'pending'
        and confirmation_deadline <= p_now and starts_at > p_now
      for update skip locked
    loop
      update public.appointments
      set status = 'cancelled', cancellation_reason = 'no_confirmation', cancelled_at = p_now, updated_at = now(),
          notes = trim(both e'\n' from notes || e'\n' || 'בוטל אוטומטית: ההגעה לא אושרה בזמן')
      where id = v_row.id and status = 'booked' and confirmation_status = 'pending';
      -- Triggers notify the customer (0012) and everyone waiting for that day (0013).
      v_cancelled := v_cancelled + 1;
    end loop;
  end if;

  -- 3. Reminders: confirmed before the reminder time, and not so close to the start that it's stale.
  for v_row in
    select * from public.appointments
    where status = 'booked' and confirmation_status = 'confirmed' and reminder_sent_at is null
      and starts_at - make_interval(mins => v_settings.reminder_minutes_before) <= p_now
      and starts_at > p_now + interval '15 minutes'
      and confirmed_at <= starts_at - make_interval(mins => v_settings.reminder_minutes_before)
    for update skip locked
  loop
    perform app.notify(app.appointment_profile(v_row), 'appointment_reminder', 'תזכורת לתור',
      format('%s · %s', app.appointment_when(v_row.starts_at), app.appointment_what(v_row)),
      '?go=appointment&id=' || v_row.id,
      format('reminder:%s:%s', v_row.id, extract(epoch from v_row.starts_at)::bigint), v_row.id);
    update public.appointments set reminder_sent_at = p_now where id = v_row.id;
    v_reminded := v_reminded + 1;
  end loop;

  -- 4. Waiting for a day that has passed.
  update public.waitlist_entries set status = 'expired', updated_at = now()
  where status = 'waiting' and wanted_date < (p_now at time zone v_settings.timezone)::date;
  get diagnostics v_expired = row_count;

  -- 5. Clean-up.
  delete from public.inbox_messages
  where (read_at is not null and created_at < p_now - interval '90 days') or created_at < p_now - interval '365 days';
  delete from public.push_deliveries where status in ('sent', 'failed') and created_at < p_now - interval '30 days';
  delete from public.notification_events where created_at < p_now - interval '120 days';

  return jsonb_build_object('requested', v_requested, 'cancelled', v_cancelled, 'reminded', v_reminded, 'expired_waits', v_expired);
end $$;

/** Kept for the existing cron job and the admin button: now runs the whole scheduler. */
create or replace function public.run_waitlist_maintenance() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_result jsonb;
begin
  if auth.uid() is not null and not app.is_staff() then
    perform app.forbid();
  end if;
  v_result := app.run_scheduler(now());
  return (v_result ->> 'requested')::int + (v_result ->> 'cancelled')::int + (v_result ->> 'reminded')::int;
end $$;

revoke all on function app.run_scheduler(timestamptz) from public, anon, authenticated;
