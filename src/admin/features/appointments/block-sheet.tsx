import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { useStaff } from '../../auth/staff-context'
import { ResponsiveSheet } from '../../components/responsive-sheet'
import { useAction } from '../../components/use-action'
import { useCatalogue } from '../../components/use-catalogue'
import { useAdminApi } from '../../data/api-context'
import type { TimeBlock } from '../../data/types'
import { canManageBarber } from '../../lib/permissions'
import { blockTimeLabel } from './block-label'

/**
 * Details of a blocked period. Whoever manages that chair (the owner, for a
 * whole-shop closure) can reopen the time; the database makes the final call.
 */
export function BlockSheet({ block, onClose }: { block: TimeBlock; onClose: () => void }) {
  const api = useAdminApi()
  const staff = useStaff()
  const { barberName } = useCatalogue()
  const { run, pending } = useAction()
  const [confirming, setConfirming] = useState(false)
  const canRemove = canManageBarber(staff, block.barberId)

  const remove = async () => {
    const removed = await run(() => api.schedule.removeBlock(block.id), 'החסימה הוסרה')
    if (removed !== null) onClose()
  }

  const footer = !canRemove ? null : confirming ? (
    <div className="flex gap-2">
      <Button variant="destructive" className="flex-1" disabled={pending} onClick={remove}>
        {pending && <Spinner />}
        הסרת החסימה
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
        חזרה
      </Button>
    </div>
  ) : (
    <Button variant="secondary" className="w-full" onClick={() => setConfirming(true)}>
      <Trash2 />
      הסרת החסימה
    </Button>
  )

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="זמן חסום"
      description={`${block.barberId ? barberName(block.barberId) : 'כל המספרה'} · ${blockTimeLabel(block)}`}
      footer={footer}
    >
      <div className="flex flex-col gap-3 text-subhead">
        <p>{block.reason || 'לא צוינה סיבה.'}</p>
        {confirming && <p className="text-muted-foreground">הזמן יחזור להיות פנוי להזמנה. תורים קיימים לא משתנים.</p>}
        {!canRemove && <p className="text-muted-foreground">רק בעלי העסק יכולים להסיר את החסימה הזו.</p>}
      </div>
    </ResponsiveSheet>
  )
}
