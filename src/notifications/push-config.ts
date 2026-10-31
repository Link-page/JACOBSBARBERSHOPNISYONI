/** The VAPID PUBLIC key (safe to ship). The private key lives only in the push-dispatch Edge Function. */
export const vapidPublicKey = ((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '').trim()
