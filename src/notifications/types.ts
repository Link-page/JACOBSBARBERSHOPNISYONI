/** Mirrors public.notification_category (supabase/migrations/0011_notifications.sql). */
export type InboxCategory =
  | 'confirmation_required'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'waitlist_available'
  | 'shop_message'

export type InboxItem = {
  id: string
  category: InboxCategory
  title: string
  body: string
  /** In-app link ('?go=…'), or null. */
  url: string | null
  createdAt: string
  readAt: string | null
}

export type NotificationPrefs = {
  /** Push for the 2-hour reminder (the inbox always gets it). */
  reminders: boolean
  /** Messages from the shop — explicit consent. */
  shopMessages: boolean
}

/** The browser's PushSubscription as JSON. */
export type DeviceSubscription = { endpoint: string; keys: { p256dh: string; auth: string } }
