import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { useIsDesktop } from '@/hooks/use-media-query'

/** Which container the panel's parts are inside, so titles and close buttons match it. */
const PanelKind = createContext<'drawer' | 'dialog'>('drawer')

type ResponsivePanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Scale the page back while open (iOS card-sheet effect, phones only). */
  scaleBackground?: boolean
  drawerClassName?: string
  dialogClassName?: string
  children: ReactNode
}

/** A draggable bottom sheet on phones and tablets, a centred dialog on desktop — same content. */
export function ResponsivePanel({ open, onOpenChange, scaleBackground, drawerClassName, dialogClassName, children }: ResponsivePanelProps) {
  const desktop = useIsDesktop()
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined} className={dialogClassName}>
          <PanelKind.Provider value="dialog">{children}</PanelKind.Provider>
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={scaleBackground}>
      <DrawerContent aria-describedby={undefined} className={drawerClassName}>
        <PanelKind.Provider value="drawer">{children}</PanelKind.Provider>
      </DrawerContent>
    </Drawer>
  )
}

export function PanelTitle(props: ComponentProps<typeof DialogTitle>) {
  return useContext(PanelKind) === 'dialog' ? <DialogTitle {...props} /> : <DrawerTitle {...props} />
}

export function PanelDescription(props: ComponentProps<typeof DialogDescription>) {
  return useContext(PanelKind) === 'dialog' ? <DialogDescription {...props} /> : <DrawerDescription {...props} />
}

export function PanelClose(props: ComponentProps<typeof DialogClose>) {
  return useContext(PanelKind) === 'dialog' ? <DialogClose {...props} /> : <DrawerClose {...props} />
}
