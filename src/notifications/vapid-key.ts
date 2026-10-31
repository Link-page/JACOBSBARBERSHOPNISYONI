/*
 * VAPID keys (Web Push). The PUBLIC key is an uncompressed P-256 point — 65
 * bytes starting with 0x04 — and is safe to ship. The PRIVATE key is 32 bytes
 * and must stay in the push-dispatch Edge Function. Telling them apart by
 * length lets the build refuse a private key pasted into the public variable.
 * Dependency-free so scripts/check-supabase-env.ts can import it directly.
 */

/** VAPID key (base64url) → its bytes. */
export function vapidKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export type VapidKeyKind = 'public' | 'private' | 'invalid'

export function classifyVapidKey(key: string): VapidKeyKind {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return 'invalid'
  let bytes: Uint8Array
  try {
    bytes = vapidKeyBytes(key)
  } catch {
    return 'invalid'
  }
  if (bytes.length === 65 && bytes[0] === 0x04) return 'public'
  if (bytes.length === 32) return 'private'
  return 'invalid'
}
