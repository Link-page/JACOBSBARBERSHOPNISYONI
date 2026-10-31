import { useState } from 'react'

import { SegmentedControl } from '@/components/segmented-control'

import { AuthLayout } from './auth-layout'
import { CheckEmail } from './check-email'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'

type Mode = { kind: 'sign-in' } | { kind: 'sign-up' } | { kind: 'check-email'; email: string }

/** First screen for a signed-out visitor: sign in or create an account. */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>({ kind: 'sign-in' })

  return (
    <AuthLayout>
      {mode.kind === 'check-email' ? (
        <CheckEmail email={mode.email} onBack={() => setMode({ kind: 'sign-in' })} />
      ) : (
        <div className="flex flex-col gap-6">
          <SegmentedControl
            id="auth-mode"
            value={mode.kind}
            onChange={(kind) => setMode({ kind })}
            options={[
              { value: 'sign-in', label: 'כניסה' },
              { value: 'sign-up', label: 'הרשמה' },
            ]}
          />
          {mode.kind === 'sign-in' ? <SignInForm /> : <SignUpForm onConfirmationSent={(email) => setMode({ kind: 'check-email', email })} />}
        </div>
      )}
    </AuthLayout>
  )
}
