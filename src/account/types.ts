/** A signed-in customer's details, from their own row in public.customers. */
export type CustomerProfile = {
  fullName: string
  /** 05XXXXXXXX */
  phone: string
  /** ISO date the customer record was created. */
  memberSince: string
}

export type ProfileInput = { fullName: string; phone: string }

export type AccountState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Signed in, but name and phone are not on record yet (e.g. right after email confirmation). */
  | { status: 'needs-profile'; email: string; suggested: ProfileInput }
  | { status: 'ready'; email: string; profile: CustomerProfile }

export type SignUpInput = ProfileInput & { email: string; password: string }
