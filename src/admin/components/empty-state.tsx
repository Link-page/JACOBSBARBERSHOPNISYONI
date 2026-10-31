import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brass-soft">
        <Icon className="size-6 text-brass" strokeWidth={1.7} />
      </span>
      <p className="mt-4 font-display text-title3 font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-subhead text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="shimmer h-16 rounded-[18px]" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}
