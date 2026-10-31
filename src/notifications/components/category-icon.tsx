import { AlarmClock, CalendarCheck, CalendarX, CircleCheck, Megaphone, Sparkles, type LucideIcon } from 'lucide-react'

import type { InboxCategory } from '../types'

const icons: Record<InboxCategory, LucideIcon> = {
  confirmation_required: CalendarCheck,
  appointment_confirmed: CircleCheck,
  appointment_cancelled: CalendarX,
  appointment_reminder: AlarmClock,
  waitlist_available: Sparkles,
  shop_message: Megaphone,
}

export function CategoryIcon({ category, className }: { category: InboxCategory; className?: string }) {
  const Icon = icons[category]
  return <Icon className={className} strokeWidth={1.9} />
}
