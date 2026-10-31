import { useMemo, useState, type ReactNode } from 'react'

import type { NotificationsApi } from './notifications-api'
import { NotificationsContext, type NotificationsValue } from './notifications-context'
import { useInboxState } from './use-inbox-state'
import { usePushState } from './use-push-state'

/** Inbox, this device's push state and the notification centre, shared by the bell, the centre and the profile. */
export function NotificationsProvider({ api, children }: { api: NotificationsApi; children: ReactNode }) {
  const inbox = useInboxState(api)
  const push = usePushState(api)
  const [open, setOpen] = useState(false)
  const value = useMemo<NotificationsValue>(() => ({ api, inbox, push, center: { open, setOpen } }), [api, inbox, push, open])
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
