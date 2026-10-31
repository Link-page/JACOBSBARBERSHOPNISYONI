import { shop } from '@/data/shop'
import { startOfDay } from '@/lib/schedule'

const priceFormat = new Intl.NumberFormat('en-IL', {
  style: 'currency',
  currency: shop.currency,
  maximumFractionDigits: 0,
})

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(shop.locale, options)
const timeFormat = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekdayLongFormat = fmt({ weekday: 'long' })
const weekdayShortFormat = fmt({ weekday: 'short' })
const dayMonthFormat = fmt({ day: 'numeric', month: 'long' })
const shortDateFormat = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const monthShortFormat = fmt({ month: 'short' })
const monthYearFormat = fmt({ month: 'long', year: 'numeric' })
const eyebrowFormat = fmt({ weekday: 'long', day: 'numeric', month: 'long' })

export const formatPrice = (amount: number) => priceFormat.format(amount)
export const formatTime = (date: Date) => timeFormat.format(date)
export const weekdayLong = (date: Date) => weekdayLongFormat.format(date)
export const weekdayShort = (date: Date) => weekdayShortFormat.format(date)
export const dayMonth = (date: Date) => dayMonthFormat.format(date)
export const shortDate = (date: Date) => shortDateFormat.format(date).replace(',', '')
export const monthShort = (date: Date) => monthShortFormat.format(date)
export const monthYear = (date: Date) => monthYearFormat.format(date)
export const eyebrowDate = (date: Date) => eyebrowFormat.format(date)

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export function relativeDay(date: Date, now: Date) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (days < 0) return days === -1 ? 'Yesterday' : `${-days} days ago`
  if (days === 0) {
    const mins = Math.max(0, Math.round((date.getTime() - now.getTime()) / 60_000))
    if (mins < 60) return `In ${mins} min`
    const hours = Math.round(mins / 60)
    return `In ${hours} hour${hours === 1 ? '' : 's'}`
  }
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? 'In 1 week' : `In ${weeks} weeks`
}

export function greeting(now: Date) {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Compact label for an open slot: "Today 15:30", "Tomorrow 09:00", "Sun 09:00". */
export function slotLabel(date: Date, time: string, now: Date) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000)
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : weekdayShort(date)
  return `${day} ${time}`
}
