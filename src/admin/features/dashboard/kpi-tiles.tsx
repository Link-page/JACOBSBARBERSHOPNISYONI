import type { LucideIcon } from 'lucide-react'
import { m } from 'motion/react'

import { spring } from '@/lib/motion'

export type Kpi = { label: string; value: string; detail?: string; icon: LucideIcon; emphasis?: boolean }

/** Headline numbers as quiet tiles; one may be emphasised in brass ink. */
export function KpiTiles({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map(({ label, value, detail, icon: Icon, emphasis }, i) => (
        <m.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: Math.min(i, 7) * 0.03 }}
          className={emphasis ? 'surface-ink rounded-[22px] p-4' : 'rounded-[22px] bg-card p-4 shadow-elevation'}
        >
          <div className="flex items-center justify-between">
            <span className={emphasis ? 'text-footnote text-ink-foreground/65' : 'text-footnote text-muted-foreground'}>{label}</span>
            <Icon className="size-4 text-brass" strokeWidth={1.8} />
          </div>
          <p className="mt-2 font-display text-[30px] leading-none font-medium tabular">{value}</p>
          {detail && <p className={emphasis ? 'mt-1.5 text-caption text-ink-foreground/55' : 'mt-1.5 text-caption text-muted-foreground'}>{detail}</p>}
        </m.div>
      ))}
    </div>
  )
}
