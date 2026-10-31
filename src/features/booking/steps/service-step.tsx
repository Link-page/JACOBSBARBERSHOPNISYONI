import { ListGroup, ListRow } from '@/components/list'
import { SelectionRing } from '@/components/selection-ring'
import { services } from '@/data/shop'
import { formatDuration, formatPrice } from '@/lib/format'

export function ServiceStep({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  return (
    <div className="px-5 pt-4 pb-8">
      <ListGroup>
        {services.map((service) => (
          <ListRow
            key={service.id}
            icon={service.icon}
            title={service.name}
            subtitle={`${formatDuration(service.duration)} · ${service.description}`}
            value={formatPrice(service.price)}
            trailing={<SelectionRing selected={value === service.id} />}
            onClick={() => onChange(service.id)}
          />
        ))}
      </ListGroup>
    </div>
  )
}
