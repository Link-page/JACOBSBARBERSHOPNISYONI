import { fromDayKey } from '@/lib/date'

import type { TimeBlock } from '../../data/types'
import { dateOf, timeOf } from './time'

const dayLabel = (date: string) => fromDayKey(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * When a block applies, in the shop's words:
 * "יום רביעי, 4 בנובמבר · 15:00–16:00", "… · כל היום", or a range of days.
 */
export function blockTimeLabel({ startsAt, endsAt }: Pick<TimeBlock, 'startsAt' | 'endsAt'>) {
  const firstDay = dateOf(startsAt)
  const lastDay = dateOf(new Date(new Date(endsAt).getTime() - 1).toISOString())
  if (timeOf(startsAt) === '00:00' && timeOf(endsAt) === '00:00') {
    return firstDay === lastDay ? `${dayLabel(firstDay)} · כל היום` : `${dayLabel(firstDay)} – ${dayLabel(lastDay)}`
  }
  if (firstDay === dateOf(endsAt)) return `${dayLabel(firstDay)} · ${timeOf(startsAt)}–${timeOf(endsAt)}`
  return `${dayLabel(firstDay)} ${timeOf(startsAt)} – ${dayLabel(dateOf(endsAt))} ${timeOf(endsAt)}`
}
