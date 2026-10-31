import { Hourglass } from 'lucide-react'
import { m } from 'motion/react'

import { barberById } from '@/data/shop'
import { spring } from '@/lib/motion'

import { BookingDetails } from '../components/booking-details'

type WaitlistOfferProps = {
  date: string
  serviceId: string
  barberId: string
  failed: boolean
  onChooseAnotherDay: () => void
}

/** Empty state for a fully booked day: explains why, and offers the waiting list (joined from the action bar). */
export function WaitlistOffer({ date, serviceId, barberId, failed, onChooseAnotherDay }: WaitlistOfferProps) {
  const who = barberId === 'any' ? 'כל התורים במספרה' : `כל התורים אצל ${barberById(barberId).name}`

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex flex-col items-center pt-4 text-center"
    >
      <span className="grid size-[72px] place-items-center rounded-full bg-brass-soft text-brass-strong">
        <Hourglass className="size-7" strokeWidth={1.7} />
      </span>
      <h3 className="mt-5 font-display text-title2 font-medium">אין תורים פנויים ביום הזה</h3>
      <p className="mt-2 max-w-[300px] text-subhead text-balance text-muted-foreground">
        {who} תפוסים. אפשר להצטרף לרשימת ההמתנה ליום הזה, או לבחור יום אחר.
      </p>

      <BookingDetails serviceId={serviceId} barberId={barberId} date={date} className="mt-6 text-start" />

      <button
        type="button"
        onClick={onChooseAnotherDay}
        className="pressable mt-5 text-subhead font-semibold underline decoration-tertiary underline-offset-4"
      >
        בחירת יום אחר
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-footnote text-destructive">
          ההרשמה לרשימת ההמתנה לא הצליחה. נסו שוב.
        </p>
      )}
    </m.div>
  )
}
