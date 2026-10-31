import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Barber } from '@/data/shop'

export function BarberAvatar({ barber, className }: { barber: Barber; className?: string }) {
  return (
    // Decorative: the barber's name is always rendered next to it.
    <Avatar aria-hidden className={className}>
      {barber.photo && <AvatarImage src={barber.photo} alt="" />}
      <AvatarFallback>{barber.initial}</AvatarFallback>
    </Avatar>
  )
}
