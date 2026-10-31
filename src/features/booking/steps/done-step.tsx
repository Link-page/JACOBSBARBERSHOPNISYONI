import { m } from 'motion/react'

import type { Appointment } from '@/api'
import { SuccessMark } from '@/components/success-mark'
import { dayKey } from '@/lib/date'
import { formatTime } from '@/lib/format'
import { spring } from '@/lib/motion'

import { BookingDetails } from '../components/booking-details'
import { DeviceOnlyNotice } from '../components/device-only-notice'

type DoneStepProps = { appointment: Appointment; rescheduled: boolean; connected: boolean }

export function DoneStep({ appointment, rescheduled, connected }: DoneStepProps) {
  const start = new Date(appointment.start)
  const title = rescheduled ? 'המועד עודכן' : connected ? 'התור נקבע' : 'התור נשמר'

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
        <BookingDetails
          serviceId={appointment.serviceId}
          barberId={appointment.barberId}
          date={dayKey(start)}
          time={formatTime(start)}
          className="mt-6 text-start"
        />
        {!connected && (
          <DeviceOnlyNotice>
            האפליקציה עדיין לא מחוברת למערכת התורים של המספרה, ולכן התור נשמר במכשיר הזה בלבד ולא נשלח למספרה.
          </DeviceOnlyNotice>
        )}
      </m.div>
    </div>
  )
}

