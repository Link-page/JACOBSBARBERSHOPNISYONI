import { CalendarDays, House, Images, UserRound, type LucideIcon } from 'lucide-react'

import type { Tab } from '@/store/types'

/** The app's sections, shared by the phone tab bar and the desktop top navigation. */
export const navItems: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'בית', icon: House },
  { id: 'lookbook', label: 'גלריה', icon: Images },
  { id: 'bookings', label: 'התורים', icon: CalendarDays },
  { id: 'profile', label: 'פרופיל', icon: UserRound },
]
