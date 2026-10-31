import type { DeviceSubscription, InboxItem, NotificationPrefs } from './types'

/** The signed-in customer's notifications. Two implementations: Supabase and the on-device demo. */
export interface NotificationsApi {
  /** False when the server can't send pushes (on-device demo, or no VAPID key configured). */
  readonly pushAvailable: boolean
  listInbox(): Promise<InboxItem[]>
  /** Marks the given messages read, or all of them. */
  markRead(ids?: string[]): Promise<void>
  savePushSubscription(subscription: DeviceSubscription): Promise<void>
  removePushSubscription(endpoint: string): Promise<void>
  getPreferences(): Promise<NotificationPrefs>
  setPreferences(prefs: NotificationPrefs): Promise<void>
}
