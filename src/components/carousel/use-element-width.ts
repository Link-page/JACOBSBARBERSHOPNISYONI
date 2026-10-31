import { useLayoutEffect, useState, type RefObject } from 'react'

/** Live content width of an element (0 until measured). */
export function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
