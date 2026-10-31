import type { ReactNode } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

import { useIsDesktop } from '@/hooks/use-media-query'

type ResponsiveSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Pinned below the scrolling body (primary actions). */
  footer?: ReactNode
  children: ReactNode
}

/** A centered dialog on desktop and a draggable bottom sheet on phones — same content. */
export function ResponsiveSheet({ open, onOpenChange, title, description, footer, children }: ResponsiveSheetProps) {
  const desktop = useIsDesktop()

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={description ? undefined : undefined}>
          <div className="px-6 pt-6 pb-2">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>
          {footer && <div className="border-t px-6 py-4">{footer}</div>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="px-5 pt-3 pb-1">
          <DrawerTitle className="font-display text-title3 font-medium">{title}</DrawerTitle>
          {description && <DrawerDescription className="mt-0.5">{description}</DrawerDescription>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="glass-bar px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">{footer}</div>}
      </DrawerContent>
    </Drawer>
  )
}
