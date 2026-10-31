import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useAction } from './use-action'
import { useAdminApi } from '../data/api-context'

/** Image by URL or upload (uploads go to the backend's media storage, owner only). */
export function ImageField({ value, folder, onChange }: { value: string | null; folder: 'logo' | 'barbers' | 'gallery'; onChange: (url: string | null) => void }) {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-muted">
        {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-muted-foreground" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input dir="ltr" placeholder="https://…" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label="כתובת תמונה" className="h-10" />
        <div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const url = await run(() => api.settings.uploadImage(file, folder), 'התמונה הועלתה')
              if (url) onChange(url)
              e.target.value = ''
            }}
          />
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
            העלאת תמונה
          </Button>
        </div>
      </div>
    </div>
  )
}
