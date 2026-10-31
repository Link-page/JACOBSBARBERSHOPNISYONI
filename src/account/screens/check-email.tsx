import { MailCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { useAccount } from '../account-context'
import { useSubmit } from '../use-submit'
import { FormError } from './auth-layout'

/** After sign-up: the customer confirms their address from the email, then lands back here signed in. */
export function CheckEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const { resendConfirmation } = useAccount()
  const { pending, error, run } = useSubmit()

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brass-soft text-brass">
        <MailCheck className="size-6" strokeWidth={1.8} />
      </span>
      <h2 className="font-display text-title2 font-medium">בדקו את תיבת המייל</h2>
      <p className="text-subhead text-muted-foreground">
        שלחנו קישור לאישור אל <bdi dir="ltr" className="font-medium text-foreground">{email}</bdi>. אחרי האישור תחזרו לכאן מחוברים.
      </p>
      <p className="text-footnote text-tertiary">כבר יש לכם חשבון עם הכתובת הזו? היכנסו עם הסיסמה שלכם.</p>
      <FormError message={error} />
      <div className="flex w-full flex-col gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => void run(() => resendConfirmation(email))}>
          {pending && <Spinner />}
          שליחה חוזרת
        </Button>
        <Button variant="ghost" onClick={onBack}>
          חזרה לכניסה
        </Button>
      </div>
    </div>
  )
}
