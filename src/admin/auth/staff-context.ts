import { createContext, useContext } from 'react'

import type { StaffSession } from '../data/types'

export const StaffContext = createContext<StaffSession | null>(null)

/** The signed-in staff member. Only available behind the auth gate. */
export function useStaff() {
  const staff = useContext(StaffContext)
  if (!staff) throw new Error('useStaff must be used behind the admin auth gate')
  return staff
}
