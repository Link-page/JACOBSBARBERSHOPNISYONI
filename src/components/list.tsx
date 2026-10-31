import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Settings-style inset grouped list. */
export function ListGroup({
  header,
  footer,
  className,
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      {header && (
        <p className="px-4 pb-2 text-footnote font-medium text-muted-foreground">{header}</p>
      )}
      <div className="overflow-hidden rounded-[24px] bg-card shadow-elevation [&>*:last-child_[data-row-body]]:border-b-0">{children}</div>
      {footer && <p className="px-4 pt-2 text-footnote text-muted-foreground">{footer}</p>}
    </div>
  )
}

/** Line icon on a soft round mark. */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-[34px] shrink-0 place-items-center rounded-full bg-muted text-foreground',
        className,
      )}
    >
      <Icon className="size-[17px]" strokeWidth={1.8} />
    </span>
  )
}

type ListRowProps = {
  icon?: LucideIcon
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  trailing?: ReactNode
  chevron?: boolean
  destructive?: boolean
  onClick?: () => void
  href?: string
  className?: string
}

export function ListRow({
  icon,
  leading,
  title,
  subtitle,
  value,
  trailing,
  chevron,
  destructive,
  onClick,
  href,
  className,
}: ListRowProps) {
  const body = (
    <>
      {(leading || icon) && <span className="py-2.5">{leading ?? (icon && <IconTile icon={icon} />)}</span>}
      <span
        data-row-body
        className="flex min-h-[54px] min-w-0 flex-1 items-center gap-3 border-b-[0.5px] py-2.5 pe-4"
      >
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-body', destructive && 'text-destructive')}>{title}</span>
          {subtitle && <span className="mt-0.5 line-clamp-2 block text-footnote text-muted-foreground">{subtitle}</span>}
        </span>
        {value && <span className="shrink-0 text-body text-muted-foreground tabular">{value}</span>}
        {trailing}
        {chevron && <ChevronRight className="-me-1 size-[18px] shrink-0 text-tertiary rtl:-scale-x-100" strokeWidth={2.4} />}
      </span>
    </>
  )

  const base = 'flex w-full items-center gap-3.5 ps-4 text-start'
  const interactive = 'transition-colors duration-150 active:bg-[var(--row-pressed)]'

  if (href) {
    const external = href.startsWith('http')
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={cn(base, interactive, className)}
      >
        {body}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, interactive, className)}>
        {body}
      </button>
    )
  }
  return <div className={cn(base, className)}>{body}</div>
}
