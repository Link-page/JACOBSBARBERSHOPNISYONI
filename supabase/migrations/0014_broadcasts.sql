-- ════════════════════════════════════════════════════════════════════════════
-- 0014 · Messages from the shop (broadcasts)
--
-- Who may send: the owner, or a barber the owner explicitly authorised
-- (profiles.can_broadcast — users cannot set it themselves).
-- Audiences:
--   opted_in — every customer who agreed to messages from the shop (consent).
--   upcoming — customers with a booked appointment in the next 7 days: service
--              notices about their visit (e.g. a closure). A barber reaches only
--              their own chair's customers.
-- Protections: idempotency key (double submits return the first send), one
-- send at a time per sender, 2 minutes between sends, a daily cap (owner 10,
-- barber 3), no identical title+body within 24 hours, at most 5000 recipients.
-- Senders see counts only — never who received it.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column can_broadcast boolean not null default false;

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id) on delete set null,
  title text not null check (length(title) between 1 and 60),
  body text not null check (length(body) between 1 and 240),
  url text check (url is null or url ~ '^\?'),
  audience text not null check (audience in ('opted_in', 'upcoming')),
  recipient_count int not null default 0,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);
create index broadcasts_sender_idx on public.broadcasts (sender_id, created_at desc);

alter table public.inbox_messages
  add constraint inbox_messages_broadcast_fk foreign key (broadcast_id) references public.broadcasts (id) on delete set null;
create index inbox_messages_broadcast_idx on public.inbox_messages (broadcast_id) where broadcast_id is not null;

create function app.can_broadcast() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.is_owner()
      or coalesce(app.is_staff() and (select can_broadcast from public.profiles where id = auth.uid()), false)
$$;

/** Owner only: allow or stop a staff account sending messages to customers. */
create function public.admin_set_broadcast_permission(p_profile uuid, p_allowed boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_owner() then
    perform app.forbid();
  end if;
  update public.profiles set can_broadcast = p_allowed where id = p_profile and role = 'barber';
end $$;

/**
 * Sends a message to an audience. Returns { id, recipients, duplicate }.
 * Errors: forbidden, invalid_broadcast, broadcast_too_soon, broadcast_limit, duplicate_broadcast.
 */
create function public.send_broadcast(p_title text, p_body text, p_audience text, p_url text, p_idempotency_key uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_sender uuid := auth.uid();
  v_owner boolean := app.is_owner();
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_existing public.broadcasts;
  v_broadcast public.broadcasts;
  v_profile uuid;
  v_count int := 0;
  v_daily_cap int := case when v_owner then 10 else 3 end;
begin
  if not app.can_broadcast() then
    perform app.forbid();
  end if;
  -- One send at a time per sender, so a double click can't slip past the checks below.
  perform pg_advisory_xact_lock(hashtextextended('broadcast:' || v_sender, 0));

  select * into v_existing from public.broadcasts where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.sender_id is distinct from v_sender then
      perform app.forbid();
    end if;
    return jsonb_build_object('id', v_existing.id, 'recipients', v_existing.recipient_count, 'duplicate', true);
  end if;

  if length(v_title) not between 1 and 60 or length(v_body) not between 1 and 240
     or p_audience not in ('opted_in', 'upcoming')
     or (p_url is not null and p_url !~ '^\?') then
    raise exception 'invalid_broadcast' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.broadcasts where sender_id = v_sender and created_at > now() - interval '2 minutes') then
    raise exception 'broadcast_too_soon' using errcode = 'P0001';
  end if;
  if (select count(*) from public.broadcasts where sender_id = v_sender and created_at > now() - interval '24 hours') >= v_daily_cap then
    raise exception 'broadcast_limit' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.broadcasts where title = v_title and body = v_body and created_at > now() - interval '24 hours') then
    raise exception 'duplicate_broadcast' using errcode = 'P0001';
  end if;

  insert into public.broadcasts (sender_id, title, body, url, audience, idempotency_key)
  values (v_sender, v_title, v_body, p_url, p_audience, p_idempotency_key)
  returning * into v_broadcast;

  for v_profile in
    select p.id from public.profiles p
    where p.role = 'customer' and (
      (p_audience = 'opted_in' and exists (
        select 1 from public.notification_preferences n where n.profile_id = p.id and n.shop_messages))
      or (p_audience = 'upcoming' and exists (
        select 1 from public.appointments a join public.customers c on c.id = a.customer_id
        where c.profile_id = p.id and a.status = 'booked'
          and a.starts_at between now() and now() + interval '7 days'
          and (v_owner or a.barber_id = app.current_barber_id())))
    )
    limit 5000
  loop
    if app.notify(v_profile, 'shop_message', v_title, v_body, p_url,
         format('broadcast:%s:%s', v_broadcast.id, v_profile), p_broadcast => v_broadcast.id) is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  update public.broadcasts set recipient_count = v_count where id = v_broadcast.id;
  return jsonb_build_object('id', v_broadcast.id, 'recipients', v_count, 'duplicate', false);
end $$;

/**
 * Sent messages with counts. "Push accepted" means the push service took it,
 * not that a device displayed it. The owner sees all; a barber their own.
 */
create function public.broadcast_history(p_limit int default 30)
returns table (
  id uuid, title text, body text, audience text, created_at timestamptz, sender_name text,
  recipients int, push_accepted bigint, push_failed bigint, push_pending bigint
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.can_broadcast() then
    perform app.forbid();
  end if;
  return query
  select b.id, b.title, b.body, b.audience, b.created_at, coalesce(nullif(p.full_name, ''), 'צוות'), b.recipient_count,
    count(d.id) filter (where d.status = 'sent'),
    count(d.id) filter (where d.status = 'failed'),
    count(d.id) filter (where d.status in ('pending', 'sending'))
  from public.broadcasts b
  left join public.profiles p on p.id = b.sender_id
  left join public.inbox_messages m on m.broadcast_id = b.id
  left join public.push_deliveries d on d.message_id = m.id
  where app.is_owner() or b.sender_id = auth.uid()
  group by b.id, p.full_name
  order by b.created_at desc
  limit least(greatest(p_limit, 1), 100);
end $$;

alter table public.broadcasts enable row level security;

revoke all on function app.can_broadcast() from public, anon, authenticated;
revoke all on function
  public.admin_set_broadcast_permission(uuid, boolean),
  public.send_broadcast(text, text, text, text, uuid),
  public.broadcast_history(int)
from public, anon;
grant execute on function
  public.admin_set_broadcast_permission(uuid, boolean),
  public.send_broadcast(text, text, text, text, uuid),
  public.broadcast_history(int)
to authenticated;
