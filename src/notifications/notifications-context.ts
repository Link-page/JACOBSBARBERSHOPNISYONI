import { createContext, useContext } from 'react'

import type { NotificationsApi } from './notifications-api'
import type { InboxState } from './use-inbox-state'
import type { PushState } from './use-push-state'

export type NotificationsValue = {
  api: NotificationsApi
  inbox: InboxState
  push: PushState
  center: { open: boolean; setOpen: (open: boolean) => void }
}

export const NotificationsContext = createContext<NotificationsValue | null>(null)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
