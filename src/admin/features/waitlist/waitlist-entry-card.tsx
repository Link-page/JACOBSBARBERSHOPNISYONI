import { CalendarPlus, Phone, Trash2 } from 'lucide-react'
import { m } from 'motion/react'

import { Button } from '@/components/ui/button'
import { spring } from '@/lib/motion'

import { useStaff } from '../../auth/staff-context'
import { useCatalogue } from '../../components/use-catalogue'
import type { WaitlistEntry } from '../../data/types'
import { canManageBarber } from '../../lib/permissions'
import { timeOf } from '../appointments/time'

export function WaitlistEntryCard({ entry, onOffer, onRemove }: { entry: WaitlistEntry; onOffer: () => void; onRemove: () => void }) {
  const staff = useStaff()
  const { serviceName, barberName } = useCatalogue()
  const manageable = entry.barberId === null || canManageBarber(staff, entry.barberId)

  return (
    <m.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="rounded-[20px] bg-card p-4 shadow-elevation">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold">{entry.customerName ?? 'לקוח'}</p>
          <p className="text-footnote text-muted-foreground">
            {serviceName(entry.serviceId)} · {barberName(entry.barberId)} · נרשם {new Date(entry.createdAt).toLocaleDateString('he-IL')}
          </p>
        </div>
        {entry.status === 'offered' ? (
          <span className="shrink-0 rounded-full bg-brass-soft px-2.5 py-1 text-caption font-semibold text-brass-strong">
            הוצע {entry.offeredStartsAt && timeOf(entry.offeredStartsAt)} · עד {entry.offerExpiresAt && timeOf(entry.offerExpiresAt)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">ממתין</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {entry.customerPhone && (
          <Button asChild size="sm" variant="secondary" className="h-9">
            <a href={`tel:${entry.customerPhone}`} dir="ltr">
              <Phone />
              {entry.customerPhone}
            </a>
          </Button>
        )}
        {manageable && (
          <>
            <Button size="sm" className="h-9" onClick={onOffer}>
              <CalendarPlus />
              {entry.status === 'offered' ? 'הצעה אחרת' : 'הצעת תור'}
            </Button>
            <Button size="sm" variant="destructive" className="h-9" onClick={onRemove}>
              <Trash2 />
              הסרה
            </Button>
          </>
        )}
      </div>
    </m.li>
  )
}
