import { useCallback, useEffect, useMemo, useState } from 'react'

import type { NotificationsApi } from './notifications-api'
import { pushClient } from './push-client'
import { vapidPublicKey } from './push-config'
import { browserPushEnvironment, detectPushSupport, type PushSupport } from './push-support'

/** 'unavailable': the server can't send pushes here (demo, or not configured yet). */
export type PushAvailability = PushSupport | 'unavailable'

export type PushState = {
  availability: PushAvailability
  permission: NotificationPermission
  subscribed: boolean
  busy: boolean
  error: string | null
  enable: () => Promise<void>
  disable: () => Promise<void>
}

const currentPermission = (): NotificationPermission => ('Notification' in window ? Notification.permission : 'default')

/** This device's push subscription: detect support, subscribe on request, keep the server's copy fresh. */
export function usePushState(api: NotificationsApi): PushState {
  const availability = useMemo<PushAvailability>(() => (api.pushAvailable ? detectPushSupport(browserPushEnvironment()) : 'unavailable'), [api])
  const [permission, setPermission] = useState(currentPermission)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An existing subscription is re-saved on each visit (it may have rotated, or moved accounts).
  useEffect(() => {
    if (availability !== 'supported') return
    pushClient.existing().then(
      (sub) => {
        if (!sub) return
        setSubscribed(true)
        void api.savePushSubscription(sub).catch(() => {})
      },
      () => {},
    )
  }, [api, availability])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const answer = await Notification.requestPermission()
      setPermission(answer)
      if (answer !== 'granted') return
      await api.savePushSubscription(await pushClient.subscribe(vapidPublicKey))
      setSubscribed(true)
    } catch {
      setError('לא הצלחנו להפעיל התראות במכשיר הזה. נסו שוב.')
    } finally {
      setBusy(false)
    }
  }, [api])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const endpoint = await pushClient.unsubscribe()
      if (endpoint) await api.removePushSubscription(endpoint)
      setSubscribed(false)
    } catch {
      setError('לא הצלחנו לכבות את ההתראות. נסו שוב.')
    } finally {
      setBusy(false)
    }
  }, [api])

  return { availability, permission, subscribed, busy, error, enable, disable }
}
