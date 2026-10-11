import type { PointerEvent, ReactNode } from 'react'
import { useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Card with a soft cursor-follow spotlight. The spotlight position is written
 * straight to the DOM (CSS variables) so hover never triggers a re-render.
 */
export function SpotlightCard({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li'
}) {
  const ref = useRef<HTMLElement>(null)

  function handleMove(event: PointerEvent<HTMLElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }

  return (
    <Tag
      ref={ref as never}
      onPointerMove={handleMove}
      className={cn(
        'group/spot relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            'radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 0%), rgba(59,91,255,0.10), transparent 62%)',
        }}
      />
      {children}
    </Tag>
  )
}
