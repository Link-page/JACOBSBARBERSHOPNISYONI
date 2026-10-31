import { cn } from '@/lib/utils'

import { timeAgo } from '../format'
import type { InboxItem } from '../types'
import { CategoryIcon } from './category-icon'

/** One message: category icon, title, text, age, and an unread dot. */
export function InboxRow({ item, now, onOpen }: { item: InboxItem; now: Date; onOpen: () => void }) {
  const unread = !item.readAt
  return (
    <li>
      <button type="button" onClick={onOpen} className={cn('pressable flex w-full gap-3 rounded-[18px] px-3 py-3 text-start', unread && 'bg-brass-soft/60')}>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', unread ? 'surface-ink text-brass' : 'bg-muted text-muted-foreground')}>
          <CategoryIcon category={item.category} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-subhead', unread ? 'font-semibold' : 'font-medium')}>{item.title}</span>
            <span className="shrink-0 text-caption text-muted-foreground">{timeAgo(item.createdAt, now)}</span>
          </span>
          <span className="line-clamp-2 block text-footnote text-muted-foreground">{item.body}</span>
        </span>
        {unread && <span aria-label="לא נקרא" className="mt-2 size-2 shrink-0 rounded-full bg-brass" />}
      </button>
    </li>
  )
}
