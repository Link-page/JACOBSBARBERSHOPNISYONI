import { NativeSelect } from '@/components/ui/input'

import { useStaff } from '../../auth/staff-context'
import { Field } from '../../components/field'
import { useCatalogue } from '../../components/use-catalogue'
import { visibleBarbers } from '../../lib/permissions'

/** Barber (limited to chairs this user manages) and the services that barber offers. */
export function BarberServiceFields({
  barberId,
  serviceId,
  onBarber,
  onService,
}: {
  barberId: string
  serviceId: string
  onBarber: (id: string) => void
  onService: (id: string) => void
}) {
  const staff = useStaff()
  const { barbers, services } = useCatalogue()
  const chairs = visibleBarbers(staff, barbers).filter((b) => b.active)
  const offered = services.filter((s) => s.active && chairs.find((b) => b.id === barberId)?.services.some((o) => o.serviceId === s.id))

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="ספר">
        {(id) => (
          <NativeSelect id={id} value={barberId} onChange={(e) => onBarber(e.target.value)}>
            <option value="">בחירה</option>
            {chairs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="טיפול">
        {(id) => (
          <NativeSelect id={id} value={serviceId} onChange={(e) => onService(e.target.value)}>
            <option value="">בחירה</option>
            {offered.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
    </div>
  )
}
