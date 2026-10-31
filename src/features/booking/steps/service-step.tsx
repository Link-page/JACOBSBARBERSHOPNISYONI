import { useCatalogue } from '@/catalogue/catalogue-context'
import { serviceIcon } from '@/catalogue/service-icon'
import { ListGroup, ListRow } from '@/components/list'
import { SelectionRing } from '@/components/selection-ring'
import { formatDuration, formatPrice } from '@/lib/format'

export function ServiceStep({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { services } = useCatalogue()
  return (
    <div className="px-5 pt-4 pb-8">
      <ListGroup>
        {services.map((service) => (
          <ListRow
            key={service.id}
            icon={serviceIcon(service)}
            title={service.name}
            subtitle={[formatDuration(service.duration), service.description].filter(Boolean).join(' · ')}
            value={formatPrice(service.price)}
            trailing={<SelectionRing selected={value === service.id} />}
            onClick={() => onChange(service.id)}
          />
        ))}
      </ListGroup>
    </div>
  )
}
