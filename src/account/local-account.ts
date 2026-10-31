import { user } from '@/data/shop'

import type { AccountApi } from './account-api'

/** On-device demo: a sample customer, no sign-in, nothing leaves the device. */
export const localAccount: AccountApi = {
  requiresSignIn: false,
  async getState() {
    return {
      status: 'ready',
      email: '',
      profile: { fullName: `${user.firstName} ${user.lastName}`, phone: user.phone.replace(/\D/g, ''), memberSince: '2023-03-01' },
    }
  },
  async signIn() {},
  async signUp() {
    return { needsConfirmation: false }
  },
  async completeProfile() {},
  async resendConfirmation() {},
  async signOut() {},
  subscribe() {
    return () => {}
  },
}
