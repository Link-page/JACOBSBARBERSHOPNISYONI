import { vapidKeyBytes } from './vapid-key'
import type { DeviceSubscription } from './types'

const scope = import.meta.env.BASE_URL

/** The app's service worker (public/sw.js): shows pushes and opens their link. Idempotent. */
const registration = () => navigator.serviceWorker.register(`${scope}sw.js`, { scope })

/** Browser side of Web Push. Only the PUBLIC VAPID key is ever used here. */
export const pushClient = {
  async existing(): Promise<DeviceSubscription | null> {
    const sub = await (await registration()).pushManager.getSubscription()
    return sub ? (sub.toJSON() as DeviceSubscription) : null
  },

  /** Must run from a user action: it may show the permission prompt. */
  async subscribe(vapidPublicKey: string): Promise<DeviceSubscription> {
    const reg = await registration()
    await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(vapidPublicKey) })
    return sub.toJSON() as DeviceSubscription
  },

  /** Returns the endpoint that was removed, if any. */
  async unsubscribe(): Promise<string | null> {
    const sub = await (await registration()).pushManager.getSubscription()
    if (!sub) return null
    await sub.unsubscribe()
    return sub.endpoint
  },
}
