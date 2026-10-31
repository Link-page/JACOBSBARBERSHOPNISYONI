import type { NotificationsApi } from './notifications-api'
import type { NotificationPrefs } from './types'

const KEY = 'jacobs.demo.notification-prefs.v1'
const defaults: NotificationPrefs = { reminders: true, shopMessages: false }

/** On-device demo: an empty inbox, no push, preferences kept on the device. */
export const localNotifications: NotificationsApi = {
  pushAvailable: false,
  async listInbox() {
    return []
  },
  async markRead() {},
  async savePushSubscription() {},
  async removePushSubscription() {},
  async getPreferences() {
    try {
      return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<NotificationPrefs>) }
    } catch {
      return defaults
    }
  },
  async setPreferences(prefs) {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      // Storage unavailable: preferences last for this visit only.
    }
  },
}
