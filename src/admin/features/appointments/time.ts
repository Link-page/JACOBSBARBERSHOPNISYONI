import { combine, dayKey } from '@/lib/date'

/** "HH:mm" of an ISO instant in local time. */
export const timeOf = (iso: string) => new Date(iso).toTimeString().slice(0, 5)
export const dateOf = (iso: string) => dayKey(new Date(iso))
/** Local date + "HH:mm" → ISO instant. */
export const toIso = (date: string, time: string) => combine(date, time).toISOString()
export const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000)
