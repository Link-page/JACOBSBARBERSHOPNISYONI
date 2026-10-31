import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

/** States plainly that a submission stayed on this device because no booking server is connected. */
export function DeviceOnlyNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 flex gap-2.5 rounded-[18px] bg-muted px-4 py-3 text-start text-footnote text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
