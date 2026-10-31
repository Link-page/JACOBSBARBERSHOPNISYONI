import { useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { useAccount } from '../account-context'
import { useSubmit } from '../use-submit'
import { hasErrors, validateSignIn, type FieldErrors } from '../validation'
import { FormError } from './auth-layout'

export function SignInForm() {
  const { signIn } = useAccount()
  const { pending, error, run } = useSubmit()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<typeof values>>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateSignIn(values)
    setErrors(found)
    if (!hasErrors(found)) void run(() => signIn(values.email, values.password))
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="אימייל" error={errors.email}>
        {(control) => (
          <Input {...control} type="email" dir="ltr" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
        )}
      </FormField>
      <FormField label="סיסמה" error={errors.password}>
        {(control) => (
          <PasswordInput {...control} autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
        )}
      </FormField>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Spinner />}
        כניסה
      </Button>
    </form>
  )
}
