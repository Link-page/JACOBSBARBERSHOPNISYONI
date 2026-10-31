import { Images } from 'lucide-react'

/** No photos uploaded yet: say so plainly (no placeholder art posing as real work). */
export function GalleryEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[28px] border border-dashed border-border px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-brass">
        <Images className="size-5" strokeWidth={1.8} />
      </span>
      <p className="text-headline font-semibold">הגלריה בדרך</p>
      <p className="max-w-xs text-subhead text-muted-foreground">תמונות של עבודות אמיתיות מהמספרה יעלו לכאן בקרוב.</p>
    </div>
  )
}
