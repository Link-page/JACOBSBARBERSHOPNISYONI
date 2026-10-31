import { memo, type ReactNode } from 'react'

import type { Look, LookPattern } from '@/data/shop'
import { publicUrl } from '@/lib/public-url'
import { tones } from '@/lib/tones'
import { cn } from '@/lib/utils'

const W = 300
const H = 400
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/**
 * Generative linework standing in for photography — each pattern hints at
 * the texture of the cut (a fade's gradient, a pompadour's wave, a buzz's grain).
 */
const patterns: Record<LookPattern, ReactNode> = {
  fade: range(30).map((i) => {
    const t = i / 29
    return <rect key={i} x={0} y={70 + i * 11} width={W} height={0.4 + t * t * 9} opacity={0.18 + t * 0.5} />
  }),
  waves: range(17).map((i) => {
    const y = 30 + i * 22
    const a = 16 + (i % 3) * 5
    return (
      <path
        key={i}
        d={`M-30 ${y} C 40 ${y - a}, 110 ${y + a}, 180 ${y} S 300 ${y - a}, 340 ${y}`}
        fill="none"
        strokeWidth={1.1}
        opacity={0.22 + (i / 16) * 0.35}
      />
    )
  }),
  dots: range(15).flatMap((row) =>
    range(13).map((col) => {
      const cx = 12 + col * 23 + (row % 2) * 11
      const cy = 40 + row * 24
      const d = Math.hypot(cx - W * 0.5, cy - H * 0.95) / 380
      return <circle key={`${row}-${col}`} cx={cx} cy={cy} r={Math.max(0.5, 3.2 * (1 - d))} opacity={0.5} />
    }),
  ),
  lines: range(46).map((i) => (
    <line
      key={i}
      x1={-120 + i * 11}
      y1={-10}
      x2={-120 + i * 11 - 170}
      y2={H + 10}
      strokeWidth={0.9}
      strokeDasharray={`${14 + (i % 5) * 6} ${4 + (i % 3) * 3}`}
      opacity={0.38}
    />
  )),
  arcs: range(26).map((i) => (
    <circle key={i} cx={W / 2} cy={H + 70} r={70 + i * 15} fill="none" strokeWidth={1} opacity={0.12 + (i % 4) * 0.08} />
  )),
  rings: range(24).map((i) => (
    <circle key={i} cx={W * 0.72} cy={H * 0.3} r={10 + i * 12.5} fill="none" strokeWidth={0.9} opacity={0.42 - i * 0.012} />
  )),
}

type LookArtworkProps = { look: Look; className?: string }

export const LookArtwork = memo(function LookArtwork({ look, className }: LookArtworkProps) {
  if (look.image) {
    return (
      <img
        src={publicUrl(look.image)}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn('absolute inset-0 size-full object-cover', className)}
      />
    )
  }

  const tone = tones[look.tone]
  const filled = look.pattern === 'fade' || look.pattern === 'dots'
  return (
    <div aria-hidden className={cn('grain absolute inset-0', className)} style={{ background: tone.background }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        fill={filled ? tone.ink : 'none'}
        stroke={filled ? 'none' : tone.ink}
      >
        {patterns[look.pattern]}
      </svg>
    </div>
  )
})
