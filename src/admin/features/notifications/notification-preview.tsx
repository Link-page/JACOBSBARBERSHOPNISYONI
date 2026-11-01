import { cn } from '@/lib/utils'

/** How the message looks on a phone's lock screen (an approximation; each system draws its own). */
export function NotificationPreview({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn('surface-ink grain rounded-[28px] p-4', className)}>
      <p className="mb-3 text-center text-caption text-ink-foreground/50">תצוגה מקדימה</p>
      <div className="relative rounded-[18px] bg-white/[0.08] p-3 backdrop-blur">
        <div className="flex items-center gap-2 text-caption text-ink-foreground/60">
          <span className="grid size-5 place-items-center rounded-[6px] bg-brass text-[9px] font-bold text-white">J</span>
          <span className="wordmark text-[10px]">JACOB'S</span>
          <span className="ms-auto">עכשיו</span>
        </div>
        <p className="mt-1.5 text-subhead font-semibold text-ink-foreground">{title.trim() || 'כותרת ההודעה'}</p>
        <p className="line-clamp-4 text-footnote text-ink-foreground/80">{body.trim() || 'כאן יופיע הטקסט.'}</p>
      </div>
    </div>
  )
}
