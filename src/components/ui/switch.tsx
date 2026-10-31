import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as React from 'react'

import { cn } from '@/lib/utils'

/** Toggle with a springy thumb; brass when on. Thumb travel follows the reading direction. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 outline-none transition-colors duration-300',
        'bg-muted data-[state=checked]:bg-brass focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)]',
          'translate-x-0 transition-transform duration-[450ms] ease-[var(--ease-spring)] data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
