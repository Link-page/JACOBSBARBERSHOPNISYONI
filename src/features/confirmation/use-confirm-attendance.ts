import { useCallback, useState } from 'react'

import { toBookingError } from '@/api'
import { backend } from '@/backend'
import { useNotifications } from '@/notifications/notifications-context'
import { useApp } from '@/store/app-context'

/** Confirms attendance on the server and updates the appointment shown everywhere. */
export function useConfirmAttendance() {
  const { saveAppointment } = useApp()
  const { inbox } = useNotifications()
  const [state, setState] = useState<{ pending: boolean; error: string | null }>({ pending: false, error: null })

  const confirm = useCallback(
    async (id: string) => {
      setState({ pending: true, error: null })
      try {
        saveAppointment(await backend.booking.confirmAttendance(id))
        inbox.refresh()
        setState({ pending: false, error: null })
      } catch (error) {
        setState({ pending: false, error: toBookingError(error).message })
      }
    },
    [saveAppointment, inbox],
  )

  return { ...state, confirm }
}
