import { Scissors } from 'lucide-react'

import { shop } from '@/data/shop'

/** Stylised neighbourhood map — no tiles, no API key, renders instantly. */
export function MapPreview() {
  return (
    <div className="relative size-full overflow-hidden bg-[var(--map-block)]">
      <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <path d="M0 0 H46 C62 38 34 92 54 170 H0 Z" fill="var(--map-water)" />
        <rect x="262" y="14" width="96" height="58" rx="10" fill="var(--map-park)" />
        <g stroke="var(--map-road)" strokeLinecap="round" fill="none">
          <path d="M40 104 H420" strokeWidth="13" />
          <path d="M212 -10 V180" strokeWidth="11" />
          <path d="M70 190 L360 -20" strokeWidth="8" />
          <path d="M60 44 H420 M60 150 H420 M128 -10 V180 M300 -10 V180 M370 -10 V180" strokeWidth="5" />
        </g>
      </svg>
      <div className="absolute top-[61%] left-[53%] -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-[pin-pulse_2.6s_ease-out_infinite] rounded-full bg-primary/35" />
        <span className="relative grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(0_0_0/0.3)] ring-[3px] ring-card">
          <Scissors className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="glass absolute top-1/2 left-full ml-2 -translate-y-1/2 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap">
          {shop.name}
        </span>
      </div>
    </div>
  )
}
