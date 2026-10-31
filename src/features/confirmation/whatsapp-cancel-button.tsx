import { MessageCircle, Phone } from 'lucide-react'

import type { Appointment } from '@/api'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useCancellationRequestLink } from './use-cancellation-link'

/**
 * Replaces "cancel" once attendance is confirmed. Opening the chat cancels
 * nothing — staff cancel after reading the request. Falls back to a phone call.
 */
export function WhatsAppCancelButton({ appointment, className }: { appointment: Appointment; className?: string }) {
  const link = useCancellationRequestLink(appointment)
  const { contact } = useCatalogue()
  const style = cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-10', className)
  if (!link) {
    return (
      <a href={`tel:${contact.phone}`} className={style}>
        <Phone className="size-4" />
        התקשרות למספרה
      </a>
    )
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={style}>
      <MessageCircle className="size-4" />
      לשיחה בוואטסאפ
    </a>
  )
}
