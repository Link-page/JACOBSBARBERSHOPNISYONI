import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'

import { useAction } from '../../components/use-action'
import { useAdminApi } from '../../data/api-context'

/**
 * Links a staff account to this barber. The person must first sign up (or be
 * invited from the Supabase dashboard); roles are changed by the database, owner only.
 */
export function AccountAccess({ barberId, linked }: { barberId: string; linked: boolean }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'barber' | 'owner'>('barber')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-footnote text-muted-foreground">{linked ? 'יש חשבון צוות מקושר לספר הזה.' : 'אין חשבון צוות מקושר עדיין.'}</p>
      <div className="flex flex-wrap gap-2">
        <Input dir="ltr" type="email" placeholder="email@example.com" className="h-10 min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="אימייל של החשבון" />
        <NativeSelect className="h-10 w-28" value={role} onChange={(e) => setRole(e.target.value as 'barber' | 'owner')} aria-label="תפקיד">
          <option value="barber">ספר</option>
          <option value="owner">בעלים</option>
        </NativeSelect>
        <Button size="sm" className="h-10" disabled={!email.includes('@') || pending} onClick={() => run(() => api.barbers.setAccountRole(email, role, barberId), 'ההרשאה עודכנה')}>
          קישור
        </Button>
      </div>
    </div>
  )
}
