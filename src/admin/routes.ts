import { Bell, CalendarDays, Hourglass, LayoutDashboard, Menu, Scissors, Settings, Users, UserRound } from 'lucide-react'

import type { RouteId } from './lib/router'

export type RouteDef = {
  id: RouteId
  label: string
  icon: typeof LayoutDashboard
  /** Only the owner sees business management. */
  ownerOnly?: boolean
  /** Only staff allowed to message customers. */
  broadcastOnly?: boolean
  /** Shown in the phone bottom bar (the rest live under "עוד"). */
  primaryOnPhone?: boolean
}

export const routes: RouteDef[] = [
  { id: 'dashboard', label: 'סקירה', icon: LayoutDashboard, primaryOnPhone: true },
  { id: 'calendar', label: 'יומן', icon: CalendarDays, primaryOnPhone: true },
  { id: 'waitlist', label: 'המתנה', icon: Hourglass, primaryOnPhone: true },
  { id: 'customers', label: 'לקוחות', icon: Users, primaryOnPhone: true },
  { id: 'notifications', label: 'התראות', icon: Bell, broadcastOnly: true },
  { id: 'barbers', label: 'צוות', icon: UserRound, ownerOnly: true },
  { id: 'services', label: 'טיפולים', icon: Scissors, ownerOnly: true },
  { id: 'settings', label: 'הגדרות', icon: Settings, ownerOnly: true },
]

export const moreRoute: RouteDef = { id: 'more', label: 'עוד', icon: Menu }
