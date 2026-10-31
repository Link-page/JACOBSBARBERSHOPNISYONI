import type { LookTone } from '@/data/shop'

/** Monochrome palettes for generated lookbook artwork. */
export const tones: Record<LookTone, { background: string; ink: string; light: boolean }> = {
  ink: {
    background: 'radial-gradient(130% 90% at 15% 0%, #3d3d41 0%, #141415 52%, #050505 100%)',
    ink: '#ffffff',
    light: false,
  },
  graphite: {
    background: 'radial-gradient(130% 90% at 85% 0%, #77777c 0%, #2f2f32 58%, #19191b 100%)',
    ink: '#ffffff',
    light: false,
  },
  silver: {
    background: 'radial-gradient(130% 90% at 15% 0%, #ffffff 0%, #e6e6ea 50%, #c3c3c9 100%)',
    ink: '#000000',
    light: true,
  },
  bone: {
    background: 'radial-gradient(130% 90% at 85% 0%, #fdfcf9 0%, #ecebe5 55%, #d4d2ca 100%)',
    ink: '#1c1c1e',
    light: true,
  },
}
