import { m } from 'motion/react'
import { useMemo, useState } from 'react'

import { LookCard } from '@/components/look-card'
import { ScrollScreen } from '@/components/scroll-screen'
import { lookCategories, looks, type Look, type LookCategory } from '@/data/shop'
import { spring, springSnappy } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Filter = 'All' | LookCategory

/** Greedy masonry: each look goes to whichever column is currently shorter. */
function toColumns(items: Look[]) {
  const columns: [Look[], Look[]] = [[], []]
  const heights = [0, 0]
  for (const item of items) {
    const i = heights[0] <= heights[1] ? 0 : 1
    columns[i].push(item)
    heights[i] += item.ratio
  }
  return columns
}

export function LookbookScreen() {
  const [filter, setFilter] = useState<Filter>('All')
  const columns = useMemo(
    () => toColumns(filter === 'All' ? looks : looks.filter((l) => l.category === filter)),
    [filter],
  )

  return (
    <ScrollScreen title="Lookbook" eyebrow="Recent work">
      <div className="scrollbar-none -mx-5 mt-4 flex gap-2 overflow-x-auto px-5" role="tablist">
        {(['All', ...lookCategories] as Filter[]).map((option) => {
          const active = option === filter
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(option)}
              className={cn(
                'pressable relative h-9 shrink-0 rounded-full px-4 text-subhead font-semibold',
                !active && 'bg-card',
              )}
            >
              {active && (
                <m.span layoutId="lookbook-filter" transition={springSnappy} className="absolute inset-0 rounded-full bg-primary" />
              )}
              <span className={cn('relative transition-colors duration-200', active && 'text-primary-foreground')}>
                {option}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 items-start gap-3">
        {columns.map((column, i) => (
          <div key={i} className="flex flex-col gap-3">
            {column.map((look) => (
              <m.div
                key={look.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
              >
                <LookCard look={look} source="lookbook" />
              </m.div>
            ))}
          </div>
        ))}
      </div>
    </ScrollScreen>
  )
}
