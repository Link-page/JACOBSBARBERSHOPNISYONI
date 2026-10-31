import { lazy } from 'react'

import type { RouteId } from './lib/router'

/* Each page is its own chunk: the first screen loads without the rest of the admin. */
export const pages: Record<Exclude<RouteId, 'more'>, React.LazyExoticComponent<() => React.JSX.Element>> = {
  dashboard: lazy(() => import('./features/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage }))),
  calendar: lazy(() => import('./features/calendar/calendar-page').then((m) => ({ default: m.CalendarPage }))),
  waitlist: lazy(() => import('./features/waitlist/waitlist-page').then((m) => ({ default: m.WaitlistPage }))),
  customers: lazy(() => import('./features/customers/customers-page').then((m) => ({ default: m.CustomersPage }))),
  notifications: lazy(() => import('./features/notifications/notifications-page').then((m) => ({ default: m.NotificationsPage }))),
  barbers: lazy(() => import('./features/barbers/barbers-page').then((m) => ({ default: m.BarbersPage }))),
  services: lazy(() => import('./features/services/services-page').then((m) => ({ default: m.ServicesPage }))),
  settings: lazy(() => import('./features/settings/settings-page').then((m) => ({ default: m.SettingsPage }))),
}
