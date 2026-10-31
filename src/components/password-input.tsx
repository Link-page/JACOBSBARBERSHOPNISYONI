import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'

/** Password field with a show/hide toggle (left-to-right, as passwords are typed). */
export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative" dir="ltr">
      <Input {...props} type={visible ? 'text' : 'password'} className="pe-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  )
}
