import { describe, expect, it } from 'vitest'

import { mediaUrl } from './media'

describe('mediaUrl', () => {
  it('keeps full https URLs saved by admin uploads', () => {
    expect(mediaUrl('https://x.supabase.co/storage/v1/object/public/media/a.jpg')).toBe('https://x.supabase.co/storage/v1/object/public/media/a.jpg')
  })

  it('returns nothing for empty values and refuses non-https URLs', () => {
    expect(mediaUrl(null)).toBeNull()
    expect(mediaUrl('  ')).toBeNull()
    expect(mediaUrl('javascript:alert(1)')).not.toMatch(/^javascript/)
  })
})
