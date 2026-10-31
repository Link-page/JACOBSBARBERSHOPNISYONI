import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { useAccount } from '../account-context'
import type { ProfileInput } from '../types'
import { useSubmit } from '../use-submit'
import { hasErrors, validateProfile, type FieldErrors } from '../validation'
import { AuthLayout, FormError } from './auth-layout'
import { ProfileFields } from './profile-fields'

/** Signed in, but the shop has no name and phone on record yet. */
export function CompleteProfileScreen({ email, suggested }: { email: string; suggested: ProfileInput }) {
  const { completeProfile, signOut } = useAccount()
  const { pending, error, run } = useSubmit()
  const [values, setValues] = useState<ProfileInput>(suggested)
  const [errors, setErrors] = useState<FieldErrors<ProfileInput>>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateProfile(values)
    setErrors(found)
    if (!hasErrors(found)) void run(() => completeProfile(values))
  }

  return (
    <AuthLayout>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-title2 font-medium">עוד פרט אחד</h2>
          <p className="mt-1 text-subhead text-muted-foreground">כדי לקבוע תורים נצטרך שם וטלפון נייד.</p>
        </div>
        <ProfileFields values={values} errors={errors} onChange={(change) => setValues((v) => ({ ...v, ...change }))} />
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          שמירה
        </Button>
        <p className="text-center text-footnote text-tertiary">
          מחוברים בתור <bdi dir="ltr">{email}</bdi> ·{' '}
          <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => void signOut()}>
            התנתקות
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}
