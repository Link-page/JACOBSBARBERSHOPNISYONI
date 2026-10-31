import type { AccountState, ProfileInput, SignUpInput } from './types'

/** Customer authentication and profile. Failures are AccountError (./errors). */
export interface AccountApi {
  /** False for the on-device demo, which has a sample customer and no sign-in. */
  readonly requiresSignIn: boolean
  getState(): Promise<Exclude<AccountState, { status: 'loading' }>>
  signIn(email: string, password: string): Promise<void>
  /** Resolves with whether the customer must confirm their email before signing in. */
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>
  completeProfile(profile: ProfileInput): Promise<void>
  resendConfirmation(email: string): Promise<void>
  signOut(): Promise<void>
  /** Called whenever the session changes (sign-in, sign-out, token refresh, another tab). */
  subscribe(onChange: () => void): () => void
}
