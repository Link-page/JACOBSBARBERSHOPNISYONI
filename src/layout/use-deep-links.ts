import { useCallback, useEffect, useRef } from 'react'

import { parseDeepLink, type DeepLink } from '@/lib/deep-link'
import { useNotifications } from '@/notifications/notifications-context'
import { useApp } from '@/store/app-context'

/** Acts on an in-app link from a notification. */
export function useDeepLinkHandler() {
  const { setTab, openBooking } = useApp()
  const { center } = useNotifications()
  return useCallback(
    (link: DeepLink) => {
      switch (link.kind) {
        case 'notifications':
          center.setOpen(true)
          break
        case 'appointment':
          setTab('bookings')
          // After the tab switch renders, bring the appointment into view.
          window.setTimeout(() => document.getElementById(`appointment-${link.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 450)
          break
        case 'book':
          openBooking({ mode: 'new', serviceId: link.serviceId, barberId: link.barberId, date: link.date })
          break
      }
    },
    [setTab, openBooking, center],
  )
}

/** A notification opened the app at '?go=…': act on it once, then tidy the address bar. */
export function useInitialDeepLink() {
  const follow = useDeepLinkHandler()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const link = parseDeepLink(location.search)
    if (!link) return
    history.replaceState(null, '', location.pathname)
    follow(link)
  }, [follow])
}
