/** Placeholder rows while a day's times load. */
export function TimeListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 pt-3">
      <span className="shimmer mb-2 h-5 w-16 rounded-full" />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="shimmer h-16 rounded-[18px]" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}
