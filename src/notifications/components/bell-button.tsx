import { Bell } from 'lucide-react'

import { cn } from '@/lib/utils'

import { useNotifications } from '../notifications-context'

/** Opens the notification centre; shows how many are unread. */
export function BellButton({ className }: { className?: string }) {
  const { inbox, center } = useNotifications()
  const label = inbox.unread ? `התראות, ${inbox.unread} שלא נקראו` : 'התראות'
  return (
    <button type="button" onClick={() => center.setOpen(true)} aria-label={label} className={cn('pressable relative grid size-11 place-items-center rounded-full bg-card shadow-elevation', className)}>
      <Bell className="size-5" strokeWidth={1.9} />
      {inbox.unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1 text-[11px] font-bold text-white tabular">
          {inbox.unread > 9 ? '9+' : inbox.unread}
        </span>
      )}
    </button>
  )
}
