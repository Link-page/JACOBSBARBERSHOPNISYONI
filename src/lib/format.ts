import { shop } from '@/data/shop'
import { daysBetween, fromDayKey } from '@/lib/date'

const priceFormat = new Intl.NumberFormat(shop.locale, {
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
const monthNameFormat = fmt({ month: 'long' })
const fullDateFormat = fmt({ weekday: 'long', day: 'numeric', month: 'long' })

export const formatPrice = (amount: number) => priceFormat.format(amount)
export const formatTime = (date: Date) => timeFormat.format(date)
export const weekdayLong = (date: Date) => weekdayLongFormat.format(date)
export const weekdayShort = (date: Date) => weekdayShortFormat.format(date)
export const dayMonth = (date: Date) => dayMonthFormat.format(date)
export const shortDate = (date: Date) => shortDateFormat.format(date)
export const monthShort = (date: Date) => monthShortFormat.format(date)
export const monthName = (date: Date) => monthNameFormat.format(date)
/** "יום שלישי, 27 באוקטובר" */
export const fullDate = (date: Date) => fullDateFormat.format(date)

/** End time of a slot that starts at "HH:mm" and lasts `minutes`. */
export function endTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} דק׳`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`
  return m ? `${hours} ו-${m} דק׳` : hours
}

export function relativeDay(date: Date, now: Date) {
  const days = daysBetween(now, date)
  if (days < 0) return days === -1 ? 'אתמול' : `לפני ${-days} ימים`
  if (days === 0) {
    const mins = Math.max(0, Math.round((date.getTime() - now.getTime()) / 60_000))
    if (mins < 60) return `בעוד ${mins} דק׳`
    const hours = Math.round(mins / 60)
    return hours === 1 ? 'בעוד שעה' : hours === 2 ? 'בעוד שעתיים' : `בעוד ${hours} שעות`
  }
  if (days === 1) return 'מחר'
  if (days === 2) return 'מחרתיים'
  if (days < 7) return `בעוד ${days} ימים`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? 'בעוד שבוע' : weeks === 2 ? 'בעוד שבועיים' : `בעוד ${weeks} שבועות`
}

export function greeting(now: Date) {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'בוקר טוב'
  if (h >= 12 && h < 17) return 'צהריים טובים'
  if (h >= 17 && h < 22) return 'ערב טוב'
  return 'לילה טוב'
}

/** Compact label for an open slot: "היום 17:30", "מחר 09:00", "יום ג׳ 09:00". */
export function slotLabel(day: string, time: string, now: Date) {
  const days = daysBetween(now, fromDayKey(day))
  const label = days === 0 ? 'היום' : days === 1 ? 'מחר' : weekdayShort(fromDayKey(day))
  return `${label} ${time}`
}
