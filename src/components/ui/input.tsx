import * as React from 'react'

import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-[14px] border border-border bg-card px-3.5 text-body text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-tertiary focus:border-brass focus:ring-[3px] focus:ring-brass-soft disabled:opacity-50'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldBase, 'h-12', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldBase, 'min-h-24 py-3', className)} {...props} />
}

/** Native select: gives the system picker on iPhone, keyboard support on desktop. */
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(fieldBase, 'h-12 appearance-none bg-[length:16px] pe-3.5', className)} {...props} />
}

export { Input, NativeSelect, Textarea }
