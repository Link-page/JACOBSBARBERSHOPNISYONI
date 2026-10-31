import { m } from 'motion/react'

import type { WaitlistReceipt } from '@/api'
import { SuccessMark } from '@/components/success-mark'
import { spring } from '@/lib/motion'

import { BookingDetails } from '../components/booking-details'
import { DeviceOnlyNotice } from '../components/device-only-notice'

type WaitlistDoneStepProps = { receipt: WaitlistReceipt; connected: boolean }

/** Confirms a waiting-list request — without claiming the shop received it unless a server did. */
export function WaitlistDoneStep({ receipt, connected }: WaitlistDoneStepProps) {
  const { request } = receipt
  const title = receipt.alreadyOnList
    ? 'כבר ברשימת ההמתנה'
    : connected
      ? 'נרשמתם לרשימת ההמתנה'
      : 'הבקשה לרשימת ההמתנה נשמרה'

  return (
    <div className="flex flex-col items-center px-5 pt-10 pb-8 text-center">
      <SuccessMark />
      <m.div
        className="w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
      >
        <h2 className="mt-7 font-display text-title1 font-medium">{title}</h2>
        {connected && <p className="mt-2 text-subhead text-muted-foreground">אם יתפנה תור ביום הזה, נעדכן אתכם.</p>}
        <BookingDetails
          serviceId={request.serviceId}
          barberId={request.barberId}
          date={request.date}
          className="mt-6 text-start"
        />
        {!connected && (
          <DeviceOnlyNotice>
            האפליקציה עדיין לא מחוברת למערכת התורים של המספרה, ולכן הבקשה נשמרה במכשיר הזה בלבד ולא נשלחה למספרה.
          </DeviceOnlyNotice>
        )}
      </m.div>
    </div>
  )
}
