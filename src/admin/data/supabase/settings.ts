import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminApi } from '../admin-api'
import { changedRows, unwrap } from './client'
import { fromSettings, toSettings, type SettingsRow } from './mappers'

export const createSettings = (db: SupabaseClient): AdminApi['settings'] => ({
  async get() {
    return toSettings(unwrap(await db.from('business_settings').select('*').single<SettingsRow>()))
  },

  async save(value) {
    changedRows(
      await db.from('business_settings').update({ ...fromSettings(value), updated_at: new Date().toISOString() }).eq('id', true).select('id'),
    )
  },

  async gallery() {
    const rows = unwrap(
      await db
        .from('gallery_items')
        .select('id, title, category, image_path, active, sort_order')
        .order('sort_order')
        .returns<{ id: string; title: string; category: string; image_path: string; active: boolean; sort_order: number }[]>(),
    )
    return rows.map((r) => ({ id: r.id, title: r.title, category: r.category, imageUrl: r.image_path, active: r.active, sortOrder: r.sort_order }))
  },

  async saveGalleryItem(item) {
    const fields = { title: item.title, category: item.category, image_path: item.imageUrl, active: item.active, sort_order: item.sortOrder }
    if (item.id) changedRows(await db.from('gallery_items').update(fields).eq('id', item.id).select('id'))
    else unwrap(await db.from('gallery_items').insert(fields))
  },

  async removeGalleryItem(id) {
    changedRows(await db.from('gallery_items').delete().eq('id', id).select('id'))
  },

  /** Owner-only by storage policy (supabase/migrations/0008_storage.sql). */
  async uploadImage(file, folder) {
    const path = `${folder}/${crypto.randomUUID()}.${file.name.split('.').pop() ?? 'jpg'}`
    unwrap(await db.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false }))
    return db.storage.from('media').getPublicUrl(path).data.publicUrl
  },
})
