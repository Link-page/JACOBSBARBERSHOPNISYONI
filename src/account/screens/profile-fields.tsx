import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'

import type { ProfileInput } from '../types'
import type { FieldErrors } from '../validation'

/** Full name and Israeli mobile — shared by sign-up and profile completion. */
export function ProfileFields({
  values,
  errors,
  onChange,
}: {
  values: ProfileInput
  errors: FieldErrors<ProfileInput>
  onChange: (change: Partial<ProfileInput>) => void
}) {
  return (
    <>
      <FormField label="שם מלא" error={errors.fullName}>
        {(control) => <Input {...control} autoComplete="name" value={values.fullName} onChange={(e) => onChange({ fullName: e.target.value })} />}
      </FormField>
      <FormField label="טלפון נייד" error={errors.phone} hint="לתזכורות ולעדכונים על התור">
        {(control) => (
          <Input
            {...control}
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="050-1234567"
            className="text-end"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        )}
      </FormField>
    </>
  )
}
