import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { useAction } from '../../components/use-action'
import { useAdminApi, useAdminQuery } from '../../data/api-context'
import type { Customer } from '../../data/types'

/** Search existing customers or add a new one inline (found by phone if it already exists). */
export function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (customer: Customer | null) => void }) {
  const api = useAdminApi()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const results = useAdminQuery(query.trim().length >= 2 ? `customers|${query.trim()}` : null, (a) => a.customers.search(query))
  const { run, pending } = useAction()

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-[14px] bg-muted px-4 py-3">
        <div>
          <p className="text-body font-medium">{value.fullName}</p>
          {value.phone && <p className="text-footnote text-muted-foreground tabular" dir="ltr">{value.phone}</p>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
          החלפה
        </Button>
      </div>
    )
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-2 rounded-[14px] bg-muted p-3">
        <Input placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} aria-label="שם מלא" />
        <Input placeholder="טלפון" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="טלפון" />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-10 flex-1"
            disabled={!name.trim() || pending}
            onClick={async () => {
              const customer = await run(() => api.customers.upsert(name, phone.trim() || null))
              if (customer) onChange(customer)
            }}
          >
            שמירת לקוח
          </Button>
          <Button size="sm" variant="secondary" className="h-10" onClick={() => setCreating(false)}>
            ביטול
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-10"
          placeholder="חיפוש לפי שם או טלפון"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="חיפוש לקוח"
        />
      </div>
      {results.data && results.data.length > 0 && (
        <ul className="mt-2 max-h-48 divide-y overflow-y-auto rounded-[14px] bg-muted">
          {results.data.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onChange(c)} className={cn('flex w-full justify-between px-4 py-2.5 text-start hover:bg-[var(--row-pressed)]')}>
                <span className="text-body">{c.fullName}</span>
                <span className="text-footnote text-muted-foreground tabular" dir="ltr">
                  {c.phone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreating(true)}>
        <Plus />
        לקוח חדש
      </Button>
    </div>
  )
}
