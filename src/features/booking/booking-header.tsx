import { ChevronLeft, X } from 'lucide-react'
import { m } from 'motion/react'

import { Button } from '@/components/ui/button'
import { DrawerClose, DrawerTitle } from '@/components/ui/drawer'
import { spring } from '@/lib/motion'

import type { BookingFlow } from './use-booking-flow'

type BookingHeaderProps = { flow: BookingFlow; title: string }

/** Sheet navigation: back (to the previous step), title with step count, close, and progress. */
export function BookingHeader({ flow, title }: BookingHeaderProps) {
  const { steps, index, isTerminal } = flow

  return (
    <div className="px-4 pt-2">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <div>
          {index > 0 && !isTerminal && (
            <Button variant="glass" size="icon-lg" onClick={flow.back} aria-label="חזרה">
              <ChevronLeft className="rtl:-scale-x-100" strokeWidth={2.4} />
            </Button>
          )}
        </div>
        <div className="text-center">
          <DrawerTitle className="font-display text-title3 font-medium">{title}</DrawerTitle>
          {!isTerminal && (
            <p className="text-caption text-muted-foreground tabular">
              שלב {index + 1} מתוך {steps.length}
            </p>
          )}
        </div>
        <DrawerClose asChild>
          <Button variant="glass" size="icon-lg" aria-label="סגירה">
            <X strokeWidth={2.4} />
          </Button>
        </DrawerClose>
      </div>

      {!isTerminal && (
        <div className="mx-1 mt-3 flex gap-1.5" aria-hidden>
          {steps.map((step, i) => (
            <div key={step} className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
              <m.div
                className={i === index ? 'h-full rounded-full bg-brass' : 'h-full rounded-full bg-primary'}
                initial={false}
                animate={{ width: i <= index ? '100%' : '0%' }}
                transition={spring}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
