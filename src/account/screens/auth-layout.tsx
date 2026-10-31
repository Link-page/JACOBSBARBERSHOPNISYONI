import type { ReactNode } from 'react'

/**
 * Brand panel + form. Phones: a dark hero above a sheet-like card.
 * Desktop: two columns, the hero filling the start side.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-background lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="surface-ink grain relative flex flex-col justify-end px-7 pt-[max(env(safe-area-inset-top),48px)] pb-16 lg:min-h-full lg:justify-center lg:px-16 lg:py-16">
        <p className="wordmark w-fit text-title3 text-brass">JACOB'S</p>
        <h1 className="mt-6 max-w-md font-display text-[34px] leading-[1.15] font-medium text-balance lg:text-[52px]">
          התור הבא שלכם, במרחק נגיעה.
        </h1>
        <p className="mt-3 max-w-sm text-subhead text-ink-foreground/65 lg:text-body">
          קביעת תורים, רשימות המתנה וכל הביקורים שלכם במקום אחד.
        </p>
      </section>
      <main className="relative -mt-8 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),24px)] lg:mt-0 lg:items-center lg:px-12 lg:py-16">
        <div className="w-full max-w-md rounded-[28px] bg-card p-6 shadow-elevation lg:p-8">{children}</div>
      </main>
    </div>
  )
}

/** Server-side failure shown above the submit button. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-[14px] bg-destructive/10 px-3.5 py-2.5 text-footnote text-destructive">
      {message}
    </p>
  )
}
