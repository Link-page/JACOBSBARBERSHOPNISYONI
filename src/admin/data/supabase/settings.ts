import type { AdminApi } from '../admin-api'
import { supabase, unwrap } from './client'
import { fromSettings, toSettings, type SettingsRow } from './mappers'

export const settings: AdminApi['settings'] = {
  async get() {
    return toSettings(unwrap(await supabase().from('business_settings').select('*').single<SettingsRow>()))
  },

  async save(value) {
    unwrap(await supabase().from('business_settings').update({ ...fromSettings(value), updated_at: new Date().toISOString() }).eq('id', true))
  },

  async gallery() {
    const rows = unwrap(
      await supabase()
        .from('gallery_items')
        .select('id, title, category, image_path, active, sort_order')
        .order('sort_order')
        .returns<{ id: string; title: string; category: string; image_path: string; active: boolean; sort_order: number }[]>(),
    )
    return rows.map((r) => ({ id: r.id, title: r.title, category: r.category, imageUrl: r.image_path, active: r.active, sortOrder: r.sort_order }))
  },

  async saveGalleryItem(item) {
    const fields = { title: item.title, category: item.category, image_path: item.imageUrl, active: item.active, sort_order: item.sortOrder }
    unwrap(item.id ? await supabase().from('gallery_items').update(fields).eq('id', item.id) : await supabase().from('gallery_items').insert(fields))
  },

  async removeGalleryItem(id) {
    unwrap(await supabase().from('gallery_items').delete().eq('id', id))
  },

  /** Owner-only by storage policy (supabase/migrations/0008_storage.sql). */
  async uploadImage(file, folder) {
    const path = `${folder}/${crypto.randomUUID()}.${file.name.split('.').pop() ?? 'jpg'}`
    unwrap(await supabase().storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false }))
    return supabase().storage.from('media').getPublicUrl(path).data.publicUrl
  },
}
