import { useId, type ReactNode } from 'react'

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/** Label + control + optional hint; the label is wired to the control for screen readers. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-footnote font-medium text-muted-foreground">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="flex flex-col">
        <span className="text-body">{label}</span>
        {hint && <span className="text-footnote text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/** A titled group inside pages and sheets. */
export function Panel({ title, action, className, children }: { title?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-[24px] bg-card p-4 shadow-elevation lg:p-5', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-title3 font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
