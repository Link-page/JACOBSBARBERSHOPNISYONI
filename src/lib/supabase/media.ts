import { supabaseSettings } from './config'

const BUCKET = 'media'

/**
 * Public URL of an image in Supabase Storage. The admin stores either the full
 * public URL (uploads) or a path inside the `media` bucket; both work here.
 */
export function mediaUrl(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  if (/^https:\/\//i.test(v)) return v
  if (!supabaseSettings.url) return null
  return `${supabaseSettings.url}/storage/v1/object/public/${BUCKET}/${v.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`
}
