import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/** Full-screen brand splash while the app gets its data. */
export function Splash() {
  return (
    <div role="status" aria-label="טוען" className="grid h-full min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <p className="wordmark text-title3">JACOB'S</p>
        <Spinner className="size-5 text-brass" />
      </div>
    </div>
  )
}

/** Full-screen failure with a retry (e.g. offline on first launch). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid h-full min-h-dvh place-items-center bg-background px-8 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <p className="wordmark text-title3">JACOB'S</p>
        <p className="text-body text-muted-foreground">{message}</p>
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw className="size-4" />
          לנסות שוב
        </Button>
      </div>
    </div>
  )
}
