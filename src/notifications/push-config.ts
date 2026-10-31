import { classifyVapidKey } from './vapid-key'

const configured = ((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '').trim()

/**
 * The VAPID PUBLIC key (safe to ship), or '' when not configured. The private
 * key lives only in the push-dispatch Edge Function; anything that isn't a
 * public key is ignored here (and refused by the build check).
 */
export const vapidPublicKey = classifyVapidKey(configured) === 'public' ? configured : ''
