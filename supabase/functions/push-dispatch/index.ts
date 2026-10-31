// Supabase Edge Function (Deno). Invoked every minute by pg_cron (see docs/notifications.md).
// Secrets come from the function's environment — never from the browser:
//   PUSH_DISPATCH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_URL;
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

import { runDispatch, safeEqual, type ClaimedDelivery, type PushResult } from '../_shared/dispatch-core.ts'
import { createWebPushSender } from '../_shared/web-push-sender.ts'

const env = (name: string) => Deno.env.get(name) ?? ''

Deno.serve(async (request) => {
  const secret = env('PUSH_DISPATCH_SECRET')
  if (!secret || !safeEqual(request.headers.get('x-dispatch-secret') ?? '', secret)) {
    return new Response('forbidden', { status: 403 })
  }
  const vapid = { subject: env('VAPID_SUBJECT'), publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY') }
  if (!vapid.subject || !vapid.publicKey || !vapid.privateKey) {
    return Response.json({ error: 'VAPID keys are not configured' }, { status: 500 })
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const summary = await runDispatch(
    {
      async claim(limit) {
        const { data, error } = await db.rpc('push_claim', { p_limit: limit })
        if (error) throw new Error(error.message)
        return (data ?? []) as ClaimedDelivery[]
      },
      async finish(id: string, result: PushResult) {
        const { error } = await db.rpc('push_finish', { p_delivery: id, p_outcome: result.outcome, p_http_status: result.status ?? null, p_error: result.error ?? null })
        if (error) throw new Error(error.message)
      },
      send: createWebPushSender(vapid),
    },
    { appBase: env('APP_URL') },
  )
  return Response.json(summary)
})
