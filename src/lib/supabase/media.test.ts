import { describe, expect, it } from 'vitest'

import { mediaUrl } from './media'

describe('mediaUrl', () => {
  it('keeps full https URLs saved by admin uploads', () => {
    expect(mediaUrl('https://x.supabase.co/storage/v1/object/public/media/a.jpg')).toBe('https://x.supabase.co/storage/v1/object/public/media/a.jpg')
  })

  it('returns nothing for empty values and never passes a non-https URL through', () => {
    expect(mediaUrl(null)).toBeNull()
    expect(mediaUrl('  ')).toBeNull()
    // Treated as a storage path: null without a project URL, otherwise an https Storage URL.
    const unsafe = mediaUrl('javascript:alert(1)')
    expect(unsafe === null || unsafe.startsWith('https://')).toBe(true)
  })
})
