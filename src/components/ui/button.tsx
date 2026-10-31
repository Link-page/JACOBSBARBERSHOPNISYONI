import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none disabled:pointer-events-none disabled:opacity-35 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.15em]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-foreground',
        ghost: 'text-foreground hover:bg-muted',
        glass: 'glass text-foreground',
        destructive: 'bg-destructive/12 text-destructive',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[52px] rounded-full px-6 text-headline',
        sm: 'h-9 rounded-full px-4 text-subhead',
        lg: 'h-[58px] rounded-full px-7 text-headline',
        icon: 'size-9 rounded-full text-[17px]',
        'icon-lg': 'size-11 rounded-full text-[19px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
