import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Panel } from '../../components/field'
import { ImageField } from '../../components/image-field'
import { useAction } from '../../components/use-action'
import { useAdminApi, useAdminQuery } from '../../data/api-context'

/** Haircut gallery shown in the customer app. */
export function GalleryPanel() {
  const api = useAdminApi()
  const { run, pending } = useAction()
  const items = useAdminQuery('gallery', (a) => a.settings.gallery())
  const [image, setImage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')

  return (
    <Panel title="גלריה">
      <div className="flex flex-col gap-2 rounded-[16px] border p-3">
        <ImageField value={image} folder="gallery" onChange={setImage} />
        <div className="flex flex-wrap gap-2">
          <Input className="h-10 min-w-0 flex-1" placeholder="כותרת" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="כותרת" />
          <Input className="h-10 w-32" placeholder="קטגוריה" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="קטגוריה" />
          <Button
            size="sm"
            className="h-10"
            disabled={!image || !title.trim() || pending}
            onClick={async () => {
              const saved = await run(
                () => api.settings.saveGalleryItem({ title: title.trim(), category: category.trim(), imageUrl: image!, active: true, sortOrder: items.data?.length ?? 0 }),
                'התמונה נוספה',
              )
              if (saved !== null) {
                setImage(null)
                setTitle('')
                setCategory('')
              }
            }}
          >
            הוספה
          </Button>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.data?.map((item) => (
          <li key={item.id} className="relative overflow-hidden rounded-[14px] bg-muted">
            <img src={item.imageUrl} alt={item.title} className="aspect-[3/4] w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-caption2 text-white">{item.title}</span>
            <Button size="icon" variant="glass" className="absolute top-1.5 end-1.5 size-8" aria-label={`מחיקת ${item.title}`} onClick={() => run(() => api.settings.removeGalleryItem(item.id), 'נמחק')}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      {items.data?.length === 0 && <p className="mt-2 text-footnote text-muted-foreground">עדיין אין תמונות. עד שיתווספו, האפליקציה מציגה איורים.</p>}
    </Panel>
  )
}
