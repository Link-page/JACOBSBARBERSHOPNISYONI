import type { ComponentType } from 'react'

import { TabBar } from '@/components/tab-bar'
import { BookingSheet } from '@/features/booking/booking-sheet'
import { GalleryViewer } from '@/features/gallery/gallery-viewer'
import { cn } from '@/lib/utils'
import { BookingsScreen } from '@/screens/bookings'
import { HomeScreen } from '@/screens/home'
import { LookbookScreen } from '@/screens/lookbook'
import { ProfileScreen } from '@/screens/profile'
import { useApp } from '@/store/app-context'
import type { Tab } from '@/store/types'

import { DesktopNav } from './desktop-nav'

const screens: { id: Tab; Screen: ComponentType }[] = [
  { id: 'home', Screen: HomeScreen },
  { id: 'lookbook', Screen: LookbookScreen },
  { id: 'bookings', Screen: BookingsScreen },
  { id: 'profile', Screen: ProfileScreen },
]

/**
 * Phones: a native-app frame with a floating tab bar. Tablets use the full
 * width; desktops get a top navigation bar and a centred content column.
 */
export function AppShell() {
  const { tab } = useApp()

  return (
    <div className="h-full bg-background">
      {/* vaul scales this wrapper back when a sheet opens, like iOS card sheets. */}
      <div
        vaul-drawer-wrapper=""
        className="relative mx-auto h-full max-w-[440px] overflow-hidden bg-background min-[441px]:shadow-[0_0_0_0.5px_var(--border)] md:max-w-none md:shadow-none"
      >
        <DesktopNav />
        <div className="absolute inset-0 lg:top-[72px]">
          {/* Every tab stays mounted so scroll position and state survive switching, as in UITabBarController. */}
          {screens.map(({ id, Screen }) => {
            const active = id === tab
            // CSS keyframes rather than JS: if the entrance never runs, the screen still shows.
            return (
              <div
                key={id}
                data-screen={id}
                inert={!active}
                aria-hidden={!active}
                className={cn('absolute inset-0', active && 'animate-[screen-in_0.32s_var(--ease-ios)]')}
              >
                <Screen />
              </div>
            )
          })}
        </div>
        <TabBar />
        <GalleryViewer />
      </div>
      <BookingSheet />
    </div>
  )
}
