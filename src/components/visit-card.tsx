import { ChevronDown, Navigation, Phone } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'

import { MapPreview } from '@/components/map-preview'
import { Button } from '@/components/ui/button'
import { shop } from '@/data/shop'
import { links } from '@/lib/links'
import { spring } from '@/lib/motion'
import { openStatus } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function VisitCard() {
  const { now } = useApp()
  const [expanded, setExpanded] = useState(false)
  const status = openStatus(now)
  const today = now.getDay()

  return (
    <div className="overflow-hidden rounded-[26px] bg-card">
      <a href={links.directions} target="_blank" rel="noreferrer" className="block h-[148px]" aria-label="Open in Maps">
        <MapPreview />
      </a>
      <div className="p-4 pt-3.5">
        <p className="text-headline font-semibold">{shop.legalName}</p>
        <p className="text-subhead text-muted-foreground">{links.fullAddress}</p>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 flex w-full items-center gap-2 rounded-xl py-1 text-left text-subhead"
        >
          <span className={cn('size-2 rounded-full', status.open ? 'bg-success' : 'bg-destructive')} />
          <span className={cn('font-semibold', status.open ? 'text-success' : 'text-destructive')}>{status.label}</span>
          <span className="truncate text-muted-foreground">· {status.detail}</span>
          <ChevronDown
            className={cn('ml-auto size-4 shrink-0 text-tertiary transition-transform duration-300', expanded && 'rotate-180')}
            strokeWidth={2.5}
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <ul className="pt-2">
                {shop.hours.map((hours, day) => (
                  <li
                    key={day}
                    className={cn(
                      'flex justify-between py-1.5 text-subhead tabular',
                      day === today ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span>{weekdays[day]}</span>
                    <span>{hours ? `${hours.open} – ${hours.close}` : 'Closed'}</span>
                  </li>
                ))}
              </ul>
            </m.div>
          )}
        </AnimatePresence>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild size="sm" className="h-11">
            <a href={links.directions} target="_blank" rel="noreferrer">
              <Navigation />
              Directions
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary" className="h-11">
            <a href={links.call}>
              <Phone />
              Call
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
