import type { ReactNode } from 'react'

/** Page title with optional subtitle and actions (actions wrap under the title on phones). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 lg:mb-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-title1 font-medium lg:text-large-title">{title}</h1>
        {subtitle && <p className="mt-0.5 text-subhead text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
