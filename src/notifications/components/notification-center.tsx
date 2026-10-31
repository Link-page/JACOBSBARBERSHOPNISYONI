import { BellRing } from 'lucide-react'

import { PanelTitle, ResponsivePanel } from '@/components/responsive-panel'
import { Button } from '@/components/ui/button'
import { useDeepLinkHandler } from '@/layout/use-deep-links'
import { parseDeepLink } from '@/lib/deep-link'
import { useApp } from '@/store/app-context'

import { useNotifications } from '../notifications-context'
import { EnablePushCard } from './enable-push-card'
import { InboxRow } from './inbox-row'

/** The in-app notification centre: works with or without push. */
export function NotificationCenter() {
  const { inbox, push, center } = useNotifications()
  const { now } = useApp()
  const follow = useDeepLinkHandler()

  return (
    <ResponsivePanel open={center.open} onOpenChange={center.setOpen} drawerClassName="h-[85dvh]" dialogClassName="h-[min(760px,85dvh)] w-[min(480px,calc(100vw-48px))]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <PanelTitle className="font-display text-title2 font-medium">התראות</PanelTitle>
        {inbox.unread > 0 && (
          <Button variant="ghost" size="sm" onClick={() => inbox.markRead()}>
            סימון הכל כנקרא
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        {!push.subscribed && <EnablePushCard className="mx-2 mb-3" />}
        {inbox.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <BellRing className="size-8 text-tertiary" />
            <p className="text-headline font-semibold">אין התראות עדיין</p>
            <p className="text-subhead text-muted-foreground">בקשות לאישור הגעה, תזכורות ועדכונים מהמספרה יופיעו כאן.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {inbox.items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                now={now}
                onOpen={() => {
                  inbox.markRead([item.id])
                  const link = item.url ? parseDeepLink(item.url) : null
                  if (link && link.kind !== 'notifications') {
                    center.setOpen(false)
                    follow(link)
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </ResponsivePanel>
  )
}
