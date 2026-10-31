import { useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { useAccount } from '../account-context'
import type { SignUpInput } from '../types'
import { useSubmit } from '../use-submit'
import { MIN_PASSWORD, hasErrors, validateSignUp, type FieldErrors } from '../validation'
import { FormError } from './auth-layout'
import { ProfileFields } from './profile-fields'

/** Name, Israeli mobile, email and password. Calls back with the email when confirmation is needed. */
export function SignUpForm({ onConfirmationSent }: { onConfirmationSent: (email: string) => void }) {
  const { signUp } = useAccount()
  const { pending, error, run } = useSubmit()
  const [values, setValues] = useState<SignUpInput>({ fullName: '', phone: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<SignUpInput>>({})
  const set = (change: Partial<SignUpInput>) => setValues((v) => ({ ...v, ...change }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateSignUp(values)
    setErrors(found)
    if (hasErrors(found)) return
    void run(async () => {
      const { needsConfirmation } = await signUp(values)
      if (needsConfirmation) onConfirmationSent(values.email.trim())
    })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <ProfileFields values={values} errors={errors} onChange={set} />
      <FormField label="אימייל" error={errors.email}>
        {(control) => <Input {...control} type="email" dir="ltr" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set({ email: e.target.value })} />}
      </FormField>
      <FormField label="סיסמה" error={errors.password} hint={`לפחות ${MIN_PASSWORD} תווים`}>
        {(control) => <PasswordInput {...control} autoComplete="new-password" value={values.password} onChange={(e) => set({ password: e.target.value })} />}
      </FormField>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Spinner />}
        יצירת חשבון
      </Button>
      <p className="text-center text-footnote text-tertiary">נשלח אליכם מייל לאישור הכתובת.</p>
    </form>
  )
}
