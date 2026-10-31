import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className }: { className?: string }) {
  return <LoaderCircle role="status" aria-label="טוען" className={cn('size-4 animate-spin', className)} />
}

export { Spinner }
