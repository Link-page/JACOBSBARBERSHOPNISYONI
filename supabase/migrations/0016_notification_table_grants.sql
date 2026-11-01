-- ════════════════════════════════════════════════════════════════════════════
-- 0016 · Default-deny for the notification tables
--
-- Supabase grants every new table in the public schema to the API roles (anon,
-- authenticated). 0006 revoked those grants for the tables that existed then;
-- the tables added in 0011 and 0014 still had them. Row Level Security already
-- hid and blocked their rows, so nothing was readable or writable — this puts
-- back the project's rule of revoking first and granting only what is needed.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on table
  public.push_subscriptions,
  public.notification_preferences,
  public.notification_events,
  public.inbox_messages,
  public.push_deliveries,
  public.broadcasts
from anon, authenticated;

-- What the customer app reads directly (RLS: own rows only). Every change goes
-- through the SECURITY DEFINER functions in 0011 and 0014.
grant select on table
  public.push_subscriptions,
  public.notification_preferences,
  public.inbox_messages
to authenticated;
