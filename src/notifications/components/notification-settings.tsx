import { AlarmClock, BellRing, Megaphone } from 'lucide-react'

import { ListGroup, ListRow } from '@/components/list'
import { Switch } from '@/components/ui/switch'

import { useNotifications } from '../notifications-context'
import { useNotificationPreferences } from '../use-notification-preferences'
import { EnablePushCard } from './enable-push-card'

/** Profile section: this device's push, the notification centre, and what the customer agrees to receive. */
export function NotificationSettings() {
  const { center, inbox } = useNotifications()
  const { prefs, update } = useNotificationPreferences()

  return (
    <section className="mt-9">
      <EnablePushCard />
      <ListGroup className="mt-3" footer="בקשות לאישור הגעה, ביטולים ועדכוני רשימת המתנה נשלחים תמיד. הודעות מהמספרה — רק אם הסכמתם.">
        <ListRow icon={BellRing} title="מרכז ההתראות" value={inbox.unread ? `${inbox.unread} חדשות` : undefined} chevron onClick={() => center.setOpen(true)} />
        <ListRow
          icon={AlarmClock}
          title="תזכורת שעתיים לפני התור"
          trailing={<Switch checked={prefs?.reminders ?? true} disabled={!prefs} onCheckedChange={(v) => update({ reminders: v })} aria-label="תזכורת שעתיים לפני התור" />}
        />
        <ListRow
          icon={Megaphone}
          title="הודעות ועדכונים מהמספרה"
          trailing={<Switch checked={prefs?.shopMessages ?? false} disabled={!prefs} onCheckedChange={(v) => update({ shopMessages: v })} aria-label="הודעות ועדכונים מהמספרה" />}
        />
      </ListGroup>
    </section>
  )
}
