/** "עכשיו", "לפני 5 דק׳", "לפני 3 שעות", "אתמול", or a date — for the notification list. */
export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דק׳`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : hours === 2 ? 'לפני שעתיים' : `לפני ${hours} שעות`
  if (hours < 48) return 'אתמול'
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}
