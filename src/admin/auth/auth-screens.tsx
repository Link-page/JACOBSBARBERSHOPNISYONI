import { LockKeyhole, ServerCog, ShieldAlert } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { Field } from '../components/field'
import { toAdminError } from '../data/errors'

function AuthFrame({ icon: Icon, title, children }: { icon: typeof LockKeyhole; title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-[400px]">
        <p className="wordmark text-center text-subhead text-brass">JACOB'S</p>
        <div className="mt-6 rounded-[28px] bg-card p-6 shadow-elevation">
          <span className="surface-ink mx-auto grid size-14 place-items-center rounded-full">
            <Icon className="size-6 text-brass" strokeWidth={1.7} />
          </span>
          <h1 className="mt-4 text-center font-display text-title2 font-medium">{title}</h1>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </main>
  )
}

/** Email + password sign-in. Credentials are checked by Supabase Auth, never in this code. */
export function SignInScreen({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await onSignIn(email, password)
    } catch (e) {
      setError(toAdminError(e).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame icon={LockKeyhole} title="כניסת צוות">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="אימייל">
          {(id) => <Input id={id} type="email" dir="ltr" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="סיסמה">
          {(id) => (
            <Input id={id} type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-footnote text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending && <Spinner />}
          כניסה
        </Button>
      </form>
    </AuthFrame>
  )
}

export function NotStaffScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <AuthFrame icon={ShieldAlert} title="אין גישה לניהול">
      <p className="text-center text-subhead text-muted-foreground">
        החשבון <span dir="ltr">{email}</span> אינו חשבון צוות. בעלי העסק יכולים להעניק גישה ממסך הצוות.
      </p>
      <Button variant="secondary" className="mt-5 w-full" onClick={onSignOut}>
        יציאה
      </Button>
    </AuthFrame>
  )
}

/** Production build without a configured backend: no data, no fake login. */
export function SetupRequiredScreen() {
  return (
    <AuthFrame icon={ServerCog} title="מערכת הניהול עוד לא חוברה">
      <p className="text-center text-subhead text-muted-foreground">
        ממשק הניהול דורש שרת מאובטח (Supabase). עד שיוגדר, אין כאן נתונים ואין אפשרות כניסה. הוראות ההגדרה נמצאות בקובץ docs/admin.md במאגר.
      </p>
    </AuthFrame>
  )
}

export function SplashScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background" aria-busy="true">
      <p className="wordmark animate-pulse text-subhead text-brass">JACOB'S</p>
    </main>
  )
}
