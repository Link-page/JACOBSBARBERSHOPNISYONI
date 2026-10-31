import { useCallback, useEffect, useMemo, useState } from 'react'

import type { NotificationsApi } from './notifications-api'
import type { InboxItem } from './types'

export type InboxState = {
  items: InboxItem[]
  unread: number
  refresh: () => void
  markRead: (ids?: string[]) => void
}

/** The inbox, refreshed when the app comes back, every minute while visible, and when a push arrives. */
export function useInboxState(api: NotificationsApi): InboxState {
  const [items, setItems] = useState<InboxItem[]>([])
  const refresh = useCallback(() => void api.listInbox().then(setItems, () => {}), [api])

  useEffect(() => {
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    const onPush = (event: MessageEvent) => (event.data as { type?: string } | null)?.type === 'push' && refresh()
    const timer = window.setInterval(() => document.visibilityState === 'visible' && refresh(), 60_000)
    document.addEventListener('visibilitychange', onVisible)
    navigator.serviceWorker?.addEventListener('message', onPush)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onPush)
    }
  }, [refresh])

  const markRead = useCallback(
    (ids?: string[]) => {
      const now = new Date().toISOString()
      setItems((list) => list.map((item) => (!item.readAt && (!ids || ids.includes(item.id)) ? { ...item, readAt: now } : item)))
      void api.markRead(ids).catch(() => {})
    },
    [api],
  )

  const unread = useMemo(() => items.filter((i) => !i.readAt).length, [items])
  return { items, unread, refresh, markRead }
}
