const weekdays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** Sunday-first weekday initials; columns follow the reading direction. */
export function WeekdayRow() {
  return (
    <div className="grid grid-cols-7 pb-1.5" aria-hidden>
      {weekdays.map((day, i) => (
        <abbr key={day} title={names[i]} className="text-center text-caption font-medium text-muted-foreground no-underline">
          {day}
        </abbr>
      ))}
    </div>
  )
}
