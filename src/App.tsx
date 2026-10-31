import { LazyMotion, MotionConfig } from 'motion/react'
import type { ComponentType } from 'react'

import { TabBar } from '@/components/tab-bar'
import { BookingSheet } from '@/features/booking/booking-sheet'
import { LookViewer } from '@/features/lookbook/look-viewer'
import { cn } from '@/lib/utils'
import { BookingsScreen } from '@/screens/bookings'
import { HomeScreen } from '@/screens/home'
import { LookbookScreen } from '@/screens/lookbook'
import { ProfileScreen } from '@/screens/profile'
import { useApp } from '@/store/app-context'
import { AppProvider } from '@/store/app-provider'
import type { Tab } from '@/store/types'

const loadMotionFeatures = () => import('@/lib/motion-features').then((mod) => mod.default)

const screens: { id: Tab; Screen: ComponentType }[] = [
  { id: 'home', Screen: HomeScreen },
  { id: 'lookbook', Screen: LookbookScreen },
  { id: 'bookings', Screen: BookingsScreen },
  { id: 'profile', Screen: ProfileScreen },
]

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <Shell />
        </AppProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

function Shell() {
  const { tab } = useApp()

  return (
    <div className="h-full bg-background">
      {/* vaul scales this wrapper back when a sheet opens, like iOS card sheets. */}
      <div
        vaul-drawer-wrapper=""
        className="relative mx-auto h-full max-w-[440px] overflow-hidden bg-background min-[441px]:shadow-[0_0_0_0.5px_var(--border)]"
      >
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
        <TabBar />
        <LookViewer />
      </div>
      <BookingSheet />
    </div>
  )
}
