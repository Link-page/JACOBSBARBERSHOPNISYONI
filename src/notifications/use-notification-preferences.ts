import { useCallback, useEffect, useState } from 'react'

import { useNotifications } from './notifications-context'
import type { NotificationPrefs } from './types'

/** The customer's notification preferences, stored on the server (or the device, in the demo). */
export function useNotificationPreferences() {
  const { api } = useNotifications()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)

  useEffect(() => void api.getPreferences().then(setPrefs, () => setPrefs({ reminders: true, shopMessages: false })), [api])

  const update = useCallback(
    (change: Partial<NotificationPrefs>) => {
      setPrefs((current) => {
        if (!current) return current
        const next = { ...current, ...change }
        void api.setPreferences(next).catch(() => setPrefs(current))
        return next
      })
    },
    [api],
  )

  return { prefs, update }
}
