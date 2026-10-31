import { AtSign, Bell, Check, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react'
import { useMemo } from 'react'

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
    <ScrollScreen title="פרופיל">
      <div className="mt-5 flex flex-col items-center rounded-[28px] bg-card px-5 pt-7 pb-5 text-center shadow-elevation">
        <Avatar aria-hidden className="size-[88px]">
          <AvatarFallback className="text-[38px]">{user.initial}</AvatarFallback>
        </Avatar>
        <p className="mt-3.5 font-display text-title2 font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-subhead text-muted-foreground tabular" dir="ltr">
          {user.phone}
        </p>
        <dl className="mt-5 grid w-full grid-cols-3 divide-x divide-border rounded-[18px] bg-elevated py-3 dark:bg-muted">
          <Stat label="ביקורים" value={String(stats.visits)} />
          <Stat label="ספר קבוע" value={stats.favorite} />
          <Stat label="חבר מאז" value={user.memberSince.split(' ')[1]} />
        </dl>
      </div>

      <LoyaltyCard />

      <ListGroup header="מראה" className="mt-9">
        <div className="p-3">
          <SegmentedControl<Appearance>
            id="appearance"
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'system', label: 'אוטומטי' },
              { value: 'light', label: 'בהיר' },
              { value: 'dark', label: 'כהה' },
            ]}
          />
        </div>
      </ListGroup>

      <ListGroup header="התראות" className="mt-9" footer="ההעדפות נשמרות במכשיר הזה.">
        <ListRow
          icon={Bell}
          title="תזכורות לתורים"
          trailing={
            <Switch
              checked={preferences.reminders}
              onCheckedChange={(v) => setPreference('reminders', v)}
              aria-label="תזכורות לתורים"
            />
          }
        />
        <ListRow
          icon={Sparkles}
          title="מבצעים ועדכונים"
          trailing={
            <Switch checked={preferences.offers} onCheckedChange={(v) => setPreference('offers', v)} aria-label="מבצעים ועדכונים" />
          }
        />
      </ListGroup>

      <ListGroup header="יצירת קשר" className="mt-9">
        <ListRow icon={Phone} title="התקשרות למספרה" value={<span dir="ltr">{shop.phone}</span>} chevron href={links.call} />
        <ListRow icon={MessageCircle} title="וואטסאפ" chevron href={links.whatsapp} />
        <ListRow icon={AtSign} title="אינסטגרם" value={<span dir="ltr">@{shop.instagram}</span>} chevron href={links.instagram} />
        <ListRow icon={MapPin} title="ניווט למספרה" subtitle={links.fullAddress} chevron href={links.directions} />
      </ListGroup>

      <p className="mt-9 flex justify-center gap-2 text-footnote text-muted-foreground">
        <span className="wordmark">{shop.name}</span>· גרסה 1.0
      </p>
    </ScrollScreen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2">
      <dt className="order-2 text-caption text-muted-foreground">{label}</dt>
      <dd className="w-full truncate font-display text-title3 font-medium tabular">{value}</dd>
    </div>
  )
}

/** Stamp card: brass stamps fill toward a free cut. */
function LoyaltyCard() {
  const remaining = user.stampsForReward - user.stamps
  return (
    <div className="surface-ink grain mt-4 rounded-[28px] p-5">
      <div className="relative">
        <p className="flex items-baseline gap-2 text-footnote text-ink-foreground/60">
          מועדון
          <span className="wordmark text-[11px] text-brass">{shop.name}</span>
        </p>
        <p className="mt-2 font-display text-title2 font-medium text-balance">
          {remaining === 1 ? 'עוד ביקור אחד לתספורת חינם' : `עוד ${remaining} ביקורים לתספורת חינם`}
        </p>
        <div className="mt-5 grid grid-cols-10 gap-1.5">
          {Array.from({ length: user.stampsForReward }, (_, i) => (
            <span
              key={i}
              className={cn(
                'grid aspect-square place-items-center rounded-full',
                i < user.stamps ? 'bg-brass text-[#141412]' : 'border border-dashed border-white/25',
              )}
            >
              {i < user.stamps && <Check className="size-3" strokeWidth={3} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
