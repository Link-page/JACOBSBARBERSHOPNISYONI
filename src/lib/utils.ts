import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the iOS type scale so `text-headline` is treated as a
// font size and never collides with colour utilities like `text-primary-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['large-title', 'title1', 'title2', 'title3', 'headline', 'body', 'callout', 'subhead', 'footnote', 'caption', 'caption2'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
