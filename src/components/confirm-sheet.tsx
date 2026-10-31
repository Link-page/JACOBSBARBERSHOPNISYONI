import { Button } from '@/components/ui/button'
import { PanelClose, PanelDescription, PanelTitle, ResponsivePanel } from '@/components/responsive-panel'

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
    <ResponsivePanel open={open} onOpenChange={onOpenChange} dialogClassName="w-[min(420px,calc(100vw-48px))]">
      <div className="flex flex-col items-center gap-1 px-5 pt-6 text-center">
        <PanelTitle className="text-title3 font-bold">{title}</PanelTitle>
        <PanelDescription className="max-w-[300px] text-balance">{message}</PanelDescription>
      </div>
      <div className="flex flex-col gap-2 px-5 pt-7 pb-[max(env(safe-area-inset-bottom),20px)]">
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
        >
          {confirmLabel}
        </Button>
        <PanelClose asChild>
          <Button variant="secondary">{cancelLabel}</Button>
        </PanelClose>
      </div>
    </ResponsivePanel>
  )
}
