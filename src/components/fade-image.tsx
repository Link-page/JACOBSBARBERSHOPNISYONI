import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * A cover-fitted photo that fades in once loaded and disappears if it fails,
 * revealing whatever fallback sits underneath it.
 */
export function FadeImage({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  // Keyed by URL so a new image starts hidden again.
  return <FadeImageInner key={src} src={src} alt={alt} className={className} />
}

function FadeImageInner({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  if (state === 'failed') return null
  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
      className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', state === 'loaded' ? 'opacity-100' : 'opacity-0', className)}
    />
  )
}
