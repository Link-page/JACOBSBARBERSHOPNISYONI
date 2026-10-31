import { Brush, Crown, Droplets, Layers, Scissors, Smile } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { serviceIcon } from './service-icon'

describe('serviceIcon', () => {
  it('picks an icon from the service name, scissors otherwise', () => {
    expect(serviceIcon({ name: 'תספורת ילדים' })).toBe(Smile)
    expect(serviceIcon({ name: 'גילוח במגבת חמה' })).toBe(Droplets)
    expect(serviceIcon({ name: 'תספורת וזקן' })).toBe(Crown)
    expect(serviceIcon({ name: 'עיצוב זקן' })).toBe(Brush)
    expect(serviceIcon({ name: 'סקין פייד' })).toBe(Layers)
    expect(serviceIcon({ name: 'תספורת הבית' })).toBe(Scissors)
  })
})
