import { ChevronDown, Navigation, Phone } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'

import { openingStatus, type OpeningStatus } from '@/booking/opening-status'
import { MapPreview } from '@/components/map-preview'
import { Button } from '@/components/ui/button'
import { shop } from '@/data/shop'
import { weekdayLong } from '@/lib/format'
import { links } from '@/lib/links'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'

const weekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function describe(status: OpeningStatus) {
  if (status.open) return { label: 'פתוח עכשיו', detail: `נסגר ב-${status.closesAt}` }
  if (status.opensAt === null) return { label: 'סגור', detail: '' }
  const when = status.daysAway === 0 ? 'היום' : status.daysAway === 1 ? 'מחר' : weekdayLong(status.day).replace('יום ', 'ביום ')
  return { label: 'סגור', detail: `ייפתח ${when} ב-${status.opensAt}` }
}

export function VisitCard() {
  const { now } = useApp()
  const [expanded, setExpanded] = useState(false)
  const status = openingStatus(now)
  const { label, detail } = describe(status)
  const today = now.getDay()

  return (
    <div className="overflow-hidden rounded-[26px] bg-card shadow-elevation">
      <a href={links.directions} target="_blank" rel="noreferrer" className="block h-[148px]" aria-label="פתיחה במפות">
        <MapPreview />
      </a>
      <div className="p-4 pt-3.5">
        <p className="flex items-baseline gap-2">
          <span className="wordmark text-subhead">{shop.name}</span>
          <span className="text-subhead text-muted-foreground">{shop.descriptor}</span>
        </p>
        <p className="text-subhead text-muted-foreground">{links.fullAddress}</p>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 flex w-full items-center gap-2 rounded-xl py-1 text-start text-subhead"
        >
          <span className={cn('size-2 rounded-full', status.open ? 'bg-success' : 'bg-destructive')} />
          <span className={cn('font-semibold', status.open ? 'text-success' : 'text-destructive')}>{label}</span>
          {detail && <span className="truncate text-muted-foreground">· {detail}</span>}
          <ChevronDown
            className={cn('ms-auto size-4 shrink-0 text-tertiary transition-transform duration-300', expanded && 'rotate-180')}
            strokeWidth={2.4}
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
                    <span dir="ltr">{hours ? `${hours.open} – ${hours.close}` : 'סגור'}</span>
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
              ניווט
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary" className="h-11">
            <a href={links.call}>
              <Phone />
              התקשרות
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
