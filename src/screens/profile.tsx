import { AtSign, Check, LogOut, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useMemo } from 'react'

import { ListGroup, ListRow } from '@/components/list'
import { ScrollScreen } from '@/components/scroll-screen'
import { SegmentedControl } from '@/components/segmented-control'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAccount, useCustomer } from '@/account/account-context'
import { backend } from '@/backend'
import { useCatalogue } from '@/catalogue/catalogue-context'
import { shop, user } from '@/data/shop'
import { formatIlMobile } from '@/lib/phone'
import { NotificationSettings } from '@/notifications/components/notification-settings'
import { links } from '@/lib/links'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-context'
import type { Appearance } from '@/store/types'

export function ProfileScreen() {
  const { past, appearance, setAppearance } = useApp()
  const { barberById } = useCatalogue()
  const profile = useCustomer()

  const stats = useMemo(() => {
    // Visits that happened: marked completed by the shop, or past and never cancelled.
    const visits = past.filter((a) => a.status === 'completed' || a.status === 'booked')
    const counts = new Map<string, number>()
    for (const v of visits) counts.set(v.barberId, (counts.get(v.barberId) ?? 0) + 1)
    const favorite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    return { visits: visits.length, favorite: favorite ? barberById(favorite).name : '—' }
  }, [past, barberById])

  return (
    <ScrollScreen title="פרופיל">
      {/* Desktop: who you are on one side, settings on the other. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div>
          <div className="mt-5 flex flex-col items-center rounded-[28px] bg-card px-5 pt-7 pb-5 text-center shadow-elevation">
            <Avatar aria-hidden className="size-[88px]">
              <AvatarFallback className="text-[38px]">{profile.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="mt-3.5 font-display text-title2 font-medium">{profile.fullName}</p>
            <p className="text-subhead text-muted-foreground tabular" dir="ltr">
              {formatIlMobile(profile.phone)}
            </p>
            <dl className="mt-5 grid w-full grid-cols-3 divide-x divide-border rounded-[18px] bg-elevated py-3 dark:bg-muted">
              <Stat label="ביקורים" value={String(stats.visits)} />
              <Stat label="ספר קבוע" value={stats.favorite} />
              <Stat label="חבר מאז" value={String(new Date(profile.memberSince).getFullYear())} />
            </dl>
          </div>

          {/* The stamp card has no backend yet: shown only in the on-device demo, never as a promise to real customers. */}
          {!backend.booking.connected && <LoyaltyCard />}
        </div>
        <div className="lg:[&>*:first-child]:mt-5">
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
          <NotificationSettings />

          <ListGroup header="יצירת קשר" className="mt-9">
            <ListRow icon={Phone} title="התקשרות למספרה" value={<span dir="ltr">{shop.phone}</span>} chevron href={links.call} />
            <ListRow icon={MessageCircle} title="וואטסאפ" chevron href={links.whatsapp} />
            <ListRow icon={AtSign} title="אינסטגרם" value={<span dir="ltr">@{shop.instagram}</span>} chevron href={links.instagram} />
            <ListRow icon={MapPin} title="ניווט למספרה" subtitle={links.fullAddress} chevron href={links.directions} />
          </ListGroup>

          <AccountSection />
        </div>
      </div>

      <p className="mt-9 flex justify-center gap-2 text-footnote text-muted-foreground">
        <span className="wordmark">{shop.name}</span>· גרסה 1.0
      </p>
    </ScrollScreen>
  )
}

/** Signed-in email and sign-out (real accounts only; the demo has no sign-in). */
function AccountSection() {
  const { state, requiresSignIn, signOut } = useAccount()
  if (!requiresSignIn || state.status !== 'ready') return null
  return (
    <ListGroup header="חשבון" className="mt-9">
      <ListRow icon={Mail} title="אימייל" value={<bdi dir="ltr">{state.email}</bdi>} />
      <ListRow icon={LogOut} title={<span className="text-destructive">התנתקות</span>} onClick={() => void signOut()} />
    </ListGroup>
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
