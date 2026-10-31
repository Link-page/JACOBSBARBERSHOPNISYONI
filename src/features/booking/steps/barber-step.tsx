import { Users } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { useCatalogue } from '@/catalogue/catalogue-context'

import { BarberPortrait } from '@/components/barber-portrait'
import { SelectionRing } from '@/components/selection-ring'
import { NextFreeLabel } from '@/components/next-free-label'
import { cn } from '@/lib/utils'

type BarberStepProps = { value?: string; serviceId: string; duration: number; onChange: (id: string) => void }

export function BarberStep({ value, serviceId, duration, onChange }: BarberStepProps) {
  // Only barbers who perform the chosen service.
  const barbers = useCatalogue().barbers.filter((b) => b.serviceIds.includes(serviceId))
  return (
    <div className="grid grid-cols-2 gap-3 px-5 pt-4 pb-8">
      <OptionCard selected={value === 'any'} onClick={() => onChange('any')} className="col-span-2 items-center gap-3.5 text-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-muted">
          <Users className="size-6" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-headline font-semibold">כל ספר פנוי</span>
          <NextFreeLabel serviceId={serviceId} barberId="any" duration={duration} prefix="הקרוב ביותר · " className="text-footnote text-muted-foreground" />
        </span>
      </OptionCard>
      {barbers.map((barber) => (
        <OptionCard
          key={barber.id}
          selected={value === barber.id}
          onClick={() => onChange(barber.id)}
          className="flex-col items-center pt-5 text-center"
        >
          <BarberPortrait barber={barber} className="size-16 text-[26px]" />
          <span className="mt-3 text-headline font-semibold">{barber.name}</span>
          <span className="line-clamp-1 text-footnote text-muted-foreground">{barber.bio}</span>
          <NextFreeLabel
            serviceId={serviceId}
            barberId={barber.id}
            duration={duration}
            className="mt-3 rounded-full bg-muted px-2.5 py-1 text-caption font-semibold tabular"
          />
        </OptionCard>
      ))}
    </div>
  )
}

function OptionCard({
  selected,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { selected: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'pressable relative flex rounded-[24px] bg-card p-4 shadow-elevation transition-shadow duration-200',
        selected && 'shadow-[inset_0_0_0_1.5px_var(--primary),var(--elevation)]',
        className,
      )}
      {...props}
    >
      {children}
      <SelectionRing selected={selected} className={cn('absolute top-3 end-3', !selected && 'opacity-0')} />
    </button>
  )
}
