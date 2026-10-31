import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type ConfirmSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
}

/** Action sheet for destructive confirmations. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel = 'לא עכשיו',
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="items-center pt-6 text-center">
          <DrawerTitle className="text-title3 font-bold">{title}</DrawerTitle>
          <DrawerDescription className="max-w-[300px] text-balance">{message}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-7">
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
          <DrawerClose asChild>
            <Button variant="secondary">{cancelLabel}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
