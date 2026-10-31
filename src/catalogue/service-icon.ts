import { Brush, Crown, Droplets, Layers, Scissors, Smile, type LucideIcon } from 'lucide-react'

import type { Service } from './types'

/** Words in a service name → its icon. The owner names services freely; unknown names get scissors. */
const byKeyword: [RegExp, LucideIcon][] = [
  [/ילד/, Smile],
  [/גילוח|תער/, Droplets],
  [/תספורת.*זקן|זקן.*תספורת|מלא/, Crown],
  [/זקן/, Brush],
  [/פייד|fade/i, Layers],
]

export function serviceIcon(service: Pick<Service, 'name'>): LucideIcon {
  return byKeyword.find(([pattern]) => pattern.test(service.name))?.[1] ?? Scissors
}
