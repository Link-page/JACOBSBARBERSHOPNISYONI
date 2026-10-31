import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type { Barber, Service } from '../../data/types'

type Offer = Barber['services'][number]

/** Which services this barber offers, with an optional barber-specific duration. */
export function BarberServicesEditor({ services, value, onChange }: { services: Service[]; value: Offer[]; onChange: (offers: Offer[]) => void }) {
  return (
    <div className="flex flex-col divide-y">
      {services.map((service) => {
        const offer = value.find((o) => o.serviceId === service.id)
        return (
          <div key={service.id} className="flex items-center gap-3 py-2">
            <Switch
              checked={!!offer}
              onCheckedChange={(on) => onChange(on ? [...value, { serviceId: service.id, durationMinutes: null }] : value.filter((o) => o.serviceId !== service.id))}
              aria-label={`מבצע ${service.name}`}
            />
            <span className="flex-1 truncate text-subhead">{service.name}</span>
            {offer && (
              <Input
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                step={5}
                className="h-10 w-24"
                placeholder={String(service.durationMinutes)}
                value={offer.durationMinutes ?? ''}
                onChange={(e) =>
                  onChange(value.map((o) => (o.serviceId === service.id ? { ...o, durationMinutes: e.target.value ? Number(e.target.value) : null } : o)))
                }
                aria-label={`משך ${service.name} (דקות)`}
              />
            )}
          </div>
        )
      })}
      <p className="pt-2 text-caption text-muted-foreground">משך ריק = משך ברירת המחדל של הטיפול.</p>
    </div>
  )
}
