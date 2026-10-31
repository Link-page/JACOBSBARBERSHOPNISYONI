import { AnimatePresence, m } from 'motion/react'
import { useCallback, useState, type ReactNode } from 'react'

import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { ToastContext, type ToastTone } from './toast-context'

type Toast = { id: number; message: string; tone: ToastTone }

/** Brief, polite confirmations and errors (announced to screen readers). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              transition={spring}
              className={cn(
                'glass rounded-full px-5 py-2.5 text-subhead font-medium',
                t.tone === 'error' && 'text-destructive',
              )}
            >
              {t.message}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
