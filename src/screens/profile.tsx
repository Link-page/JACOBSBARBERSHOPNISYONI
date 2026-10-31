import { AtSign, Bell, Check, Crown, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react'
import { useMemo } from 'react'

import { passSurface } from '@/components/appointment-pass'
import { ListGroup, ListRow } from '@/components/list'
import { ScrollScreen } from '@/components/scroll-screen'
import { SegmentedControl } from '@/components/segmented-control'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { barberById, shop, user } from '@/data/shop'
import { links } from '@/lib/links'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'
import type { Appearance } from '@/store/types'

export function ProfileScreen() {
  const { past, appearance, setAppearance, preferences, setPreference } = useApp()

  const stats = useMemo(() => {
    const visits = past.filter((a) => a.status === 'booked')
    const counts = new Map<string, number>()
    for (const v of visits) counts.set(v.barberId, (counts.get(v.barberId) ?? 0) + 1)
    const favorite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    return { visits: visits.length, favorite: favorite ? barberById(favorite).name : '—' }
  }, [past])

  return (
    <ScrollScreen title="Profile">
      <div className="mt-5 flex flex-col items-center rounded-[28px] bg-card px-5 pt-7 pb-5 text-center">
        <Avatar className="size-[88px]">
          <AvatarFallback className="text-[34px]">{user.initials}</AvatarFallback>
        </Avatar>
        <p className="mt-3.5 text-title2 font-bold">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-subhead text-muted-foreground tabular">{user.phone}</p>
        <dl className="mt-5 grid w-full grid-cols-3 divide-x-[0.5px] divide-border rounded-[18px] bg-elevated py-3 dark:bg-muted">
          <Stat label="Visits" value={String(stats.visits)} />
          <Stat label="Barber" value={stats.favorite} />
          <Stat label="Member" value={user.memberSince.split(' ')[1]} />
        </dl>
      </div>

      <LoyaltyCard />

      <ListGroup header="Appearance" className="mt-9">
        <div className="p-3">
          <SegmentedControl<Appearance>
            id="appearance"
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'system', label: 'Automatic' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
      </ListGroup>

      <ListGroup
        header="Notifications"
        className="mt-9"
        footer="Reminders arrive the evening before and one hour before your appointment."
      >
        <ListRow
          icon={Bell}
          title="Appointment reminders"
          trailing={
            <Switch
              checked={preferences.reminders}
              onCheckedChange={(v) => setPreference('reminders', v)}
              aria-label="Appointment reminders"
            />
          }
        />
        <ListRow
          icon={Sparkles}
          title="Offers & news"
          trailing={
            <Switch checked={preferences.offers} onCheckedChange={(v) => setPreference('offers', v)} aria-label="Offers & news" />
          }
        />
      </ListGroup>

      <ListGroup header="Contact" className="mt-9">
        <ListRow icon={Phone} title="Call the shop" value={shop.phone} chevron href={links.call} />
        <ListRow icon={MessageCircle} title="WhatsApp" chevron href={links.whatsapp} />
        <ListRow icon={AtSign} title="Instagram" value={`@${shop.instagram}`} chevron href={links.instagram} />
        <ListRow icon={MapPin} title="Directions" subtitle={links.fullAddress} chevron href={links.directions} />
      </ListGroup>

      <p className="mt-9 text-center text-footnote text-muted-foreground">{shop.legalName} · Version 1.0</p>
    </ScrollScreen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2">
      <dt className="order-2 text-caption text-muted-foreground">{label}</dt>
      <dd className="w-full truncate text-headline font-semibold tabular">{value}</dd>
    </div>
  )
}

/** Stamp card in the style of a Wallet loyalty pass. */
function LoyaltyCard() {
  const remaining = user.stampsForReward - user.stamps
  return (
    <div className={cn(passSurface, 'mt-4 rounded-[28px] p-5')}>
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-caption font-semibold tracking-[0.14em] text-white/55 uppercase">{shop.name} Club</p>
          <Crown className="size-4 text-white/70" />
        </div>
        <p className="mt-3 text-title2 font-bold text-balance">
          {remaining} more {remaining === 1 ? 'visit' : 'visits'} to a free cut
        </p>
        <div className="mt-5 grid grid-cols-10 gap-1.5">
          {Array.from({ length: user.stampsForReward }, (_, i) => (
            <span
              key={i}
              className={cn(
                'grid aspect-square place-items-center rounded-full',
                i < user.stamps ? 'bg-white text-black' : 'border border-dashed border-white/30',
              )}
            >
              {i < user.stamps && <Check className="size-3" strokeWidth={3.25} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
