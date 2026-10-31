import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ControlProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

/** Label, control and an error (or hint) wired together for screen readers. */
export function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: (control: ControlProps) => ReactNode
}) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-footnote font-medium text-muted-foreground">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': message ? messageId : undefined })}
      {message && (
        <p id={messageId} className={cn('text-footnote', error ? 'text-destructive' : 'text-tertiary')}>
          {message}
        </p>
      )}
    </div>
  )
}
