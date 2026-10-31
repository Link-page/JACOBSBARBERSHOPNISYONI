import { FlaskConical } from 'lucide-react'

import type { PrototypeBackend } from '../data/prototype'
import { cn } from '@/lib/utils'

/** Always-visible label for the development prototype, with a role switch to test permissions. */
export function PrototypeBanner({ prototype }: { prototype: PrototypeBackend }) {
  return (
    <div role="note" className="sticky top-0 z-40 flex items-center gap-3 bg-brass px-4 py-1.5 text-footnote font-medium text-[#141412]">
      <FlaskConical className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">אב-טיפוס לפיתוח · נתוני דוגמה בזיכרון, לא נשמרים ולא מחוברים לשרת</span>
      <div className="flex shrink-0 rounded-full bg-black/15 p-0.5">
        {(['owner', 'barber'] as const).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => prototype.setRole(role)}
            className={cn('rounded-full px-2.5 py-0.5', prototype.role === role && 'bg-[#141412] text-brass')}
          >
            {role === 'owner' ? 'בעלים' : 'ספר'}
          </button>
        ))}
      </div>
    </div>
  )
}
